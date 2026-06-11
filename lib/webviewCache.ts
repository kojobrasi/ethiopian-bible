/**
 * Network-first cache for the internal WebView.
 *
 * Strategy:
 *   1. Always attempt a live fetch first.
 *   2. On success save the response HTML + metadata to disk via expo-file-system.
 *   3. On network failure (offline / timeout) fall back to the cached file.
 *
 * Cache key: md5-style slug derived from the URL so filenames stay filesystem-safe.
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = FileSystem.cacheDirectory + 'webview_cache/';
const META_PREFIX = 'wv_cache_meta_';
const FETCH_TIMEOUT_MS = 10_000;

type CacheMeta = {
  url: string;
  cachedAt: number;
};

function urlToKey(url: string): string {
  // Replace every non-alphanumeric character with '_' to get a safe filename
  return url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function readCached(key: string): Promise<string | null> {
  const path = CACHE_DIR + key + '.html';
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  return FileSystem.readAsStringAsync(path);
}

async function writeCached(key: string, html: string, url: string): Promise<void> {
  await ensureDir();
  const path = CACHE_DIR + key + '.html';
  await FileSystem.writeAsStringAsync(path, html, { encoding: FileSystem.EncodingType.UTF8 });
  const meta: CacheMeta = { url, cachedAt: Date.now() };
  await AsyncStorage.setItem(META_PREFIX + key, JSON.stringify(meta));
}

export async function getCacheMeta(url: string): Promise<CacheMeta | null> {
  const key = urlToKey(url);
  const raw = await AsyncStorage.getItem(META_PREFIX + key);
  return raw ? (JSON.parse(raw) as CacheMeta) : null;
}

/**
 * Returns `{ html, fromCache }`.
 * - Tries live fetch first (network-first).
 * - Falls back to disk cache when offline or fetch times out.
 * - Returns `null` when neither is available.
 */
export async function fetchWithCache(
  url: string,
): Promise<{ html: string; fromCache: boolean } | null> {
  const key = urlToKey(url);

  // --- 1. Try network first ---
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timer);

    if (response.ok) {
      const html = await response.text();
      // Persist to disk asynchronously (don't block rendering)
      writeCached(key, html, url).catch(() => {});
      return { html, fromCache: false };
    }
  } catch {
    // Network error or abort — fall through to cache
  }

  // --- 2. Fall back to cache ---
  try {
    const html = await readCached(key);
    if (html) return { html, fromCache: true };
  } catch {
    // Cache read failed
  }

  return null;
}

export async function clearCache(url?: string) {
  if (url) {
    const key = urlToKey(url);
    const path = CACHE_DIR + key + '.html';
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
    await AsyncStorage.removeItem(META_PREFIX + key);
  } else {
    // Clear all
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(META_PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  }
}
