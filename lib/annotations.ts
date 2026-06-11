/**
 * Offline annotations for Bible verses — highlights and notes.
 *
 * Uses a JSON key per book+chapter under the `wol_annotations_` prefix
 * in AsyncStorage (or localStorage fallback on web).
 *
 * Structure:
 *   key: `wol_annot_book_${bookNumber}_ch_${chapter}`
 *   value: JSON string of AnnotationEntry[]
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type HighlightEntry = {
  verse: number;
  color: string; // hex color string e.g. "#FFD700"
};

export type NoteEntry = {
  verse: number;
  text: string;
  updatedAt: string; // ISO string
};

export type AnnotationEntry = {
  verse: number;
  highlight?: string; // hex color
  note?: string;      // note text
  noteUpdatedAt?: string;
};

function storageKey(bookNumber: number, chapter: number): string {
  return `wol_annot_book_${bookNumber}_ch_${chapter}`;
}

async function loadAnnotations(bookNumber: number, chapter: number): Promise<AnnotationEntry[]> {
  try {
    const key = storageKey(bookNumber, chapter);
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as AnnotationEntry[];
  } catch {
    // ignore read errors
  }
  return [];
}

async function saveAnnotations(bookNumber: number, chapter: number, entries: AnnotationEntry[]): Promise<void> {
  try {
    const key = storageKey(bookNumber, chapter);
    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // ignore write errors
  }
}

function upsertEntry(entries: AnnotationEntry[], verse: number, update: Partial<AnnotationEntry>): AnnotationEntry[] {
  const idx = entries.findIndex((e) => e.verse === verse);
  if (idx >= 0) {
    const updated = { ...entries[idx], ...update, verse };
    entries = [...entries];
    entries[idx] = updated;
  } else {
    entries = [...entries, { verse, ...update }];
  }
  return entries;
}

// ─── Highlight API ───────────────────────────────────────────────────────────

export async function setHighlight(
  bookNumber: number,
  chapter: number,
  verse: number,
  color: string | null, // null = remove highlight
): Promise<AnnotationEntry[]> {
  let entries = await loadAnnotations(bookNumber, chapter);
  if (color) {
    entries = upsertEntry(entries, verse, { highlight: color });
  } else {
    entries = entries.filter((e) => e.verse !== verse || e.note);
    if (entries.length === 0 && !entries.find((e) => e.verse === verse && e.note)) {
      entries = entries.filter((e) => e.verse !== verse);
    }
    entries = entries.map((e) => (e.verse === verse ? { ...e, highlight: undefined } : e));
    entries = entries.filter((e) => e.highlight || e.note);
  }
  await saveAnnotations(bookNumber, chapter, entries);
  return entries;
}

export async function getHighlight(
  bookNumber: number,
  chapter: number,
  verse: number,
): Promise<string | null> {
  const entries = await loadAnnotations(bookNumber, chapter);
  const entry = entries.find((e) => e.verse === verse);
  return entry?.highlight ?? null;
}

export async function getAllHighlights(
  bookNumber: number,
  chapter: number,
): Promise<Record<number, string>> {
  const entries = await loadAnnotations(bookNumber, chapter);
  const result: Record<number, string> = {};
  for (const e of entries) {
    if (e.highlight) result[e.verse] = e.highlight;
  }
  return result;
}

// ─── Notes API ───────────────────────────────────────────────────────────────

export async function setNote(
  bookNumber: number,
  chapter: number,
  verse: number,
  text: string | null, // null = remove note
): Promise<AnnotationEntry[]> {
  let entries = await loadAnnotations(bookNumber, chapter);
  if (text) {
    entries = upsertEntry(entries, verse, { note: text, noteUpdatedAt: new Date().toISOString() });
  } else {
    entries = entries.map((e) => (e.verse === verse ? { ...e, note: undefined, noteUpdatedAt: undefined } : e));
    entries = entries.filter((e) => e.highlight || e.note);
  }
  await saveAnnotations(bookNumber, chapter, entries);
  return entries;
}

export async function getNote(
  bookNumber: number,
  chapter: number,
  verse: number,
): Promise<string | null> {
  const entries = await loadAnnotations(bookNumber, chapter);
  const entry = entries.find((e) => e.verse === verse);
  return entry?.note ?? null;
}

export async function getAllNotes(
  bookNumber: number,
  chapter: number,
): Promise<Record<number, { text: string; updatedAt: string }>> {
  const entries = await loadAnnotations(bookNumber, chapter);
  const result: Record<number, { text: string; updatedAt: string }> = {};
  for (const e of entries) {
    if (e.note) result[e.verse] = { text: e.note, updatedAt: e.noteUpdatedAt ?? '' };
  }
  return result;
}

// ─── Bulk load (for initial chapter load) ────────────────────────────────────

export async function loadAnnotationsForChapter(
  bookNumber: number,
  chapter: number,
): Promise<{
  highlights: Record<number, string>;
  notes: Record<number, { text: string; updatedAt: string }>;
}> {
  const entries = await loadAnnotations(bookNumber, chapter);
  const highlights: Record<number, string> = {};
  const notes: Record<number, { text: string; updatedAt: string }> = {};
  for (const e of entries) {
    if (e.highlight) highlights[e.verse] = e.highlight;
    if (e.note) notes[e.verse] = { text: e.note, updatedAt: e.noteUpdatedAt ?? '' };
  }
  return { highlights, notes };
}
