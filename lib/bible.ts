// Ethiopian KJV (91-book canon) — https://apps.ampiaw.com/mat-bible/en/faqs/data/ekjv/

export type BibleVerse = {
  verse: number;
  text: string;
};

export type BibleChapterMeta = {
  chapter: number;
  verseCount: number;
};

export type BibleBookMeta = {
  bookNumber: number;
  shortName: string;
  longName: string;
  bookColor: string;
  chapterCount: number;
  verseCount: number;
};

export type BibleBookData = {
  book: BibleBookMeta;
  chapters: BibleChapterMeta[];
  versesByChapter: Record<string, BibleVerse[]>;
};

// section_key values from the ekjv catalog
// ot = Old Testament, nt = New Testament, dc = Deuterocanonical, ec = Ethiopian Canon
export type CatalogBook = {
  slug: string;
  name: string;
  short_name: string;
  long_name: string;
  section_key: 'ot' | 'nt' | 'dc' | 'ec';
  book_number: number;
  chapter_count: number;
  available_chapters: number[];
  chapter_path: string;
};

export type Catalog = {
  version: {
    slug: string;
    label: string;
    short_label: string;
    canon_type: string;
  };
  available_books: string[];
  books: CatalogBook[];
};

// ── URL helpers (configurable) ───────────────────────────────────────────────

const PROXY_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/bible-proxy`
  : undefined;

// Default base dir (used when the app first loads) — prefer local copy
let BASE_URL = '/data/ekjv';

// Allow runtime override of the base URL (used when user selects another version)
export function setBibleBaseUrl(url: string) {
  BASE_URL = url;
}

// Clear internal caches (useful after switching versions)
export function clearBookCache() {
  bookCache.clear();
}

// On web, route through the Supabase edge function to add CORS headers
// Build the raw URL for a given path against the configured base
function buildRawUrl(path: string): string {
  const base = BASE_URL.replace(/\/$/, '');
  return `${base}/${path}`;
}

// Try direct fetch first (useful for local `/data/...` files), then
// fall back to the Supabase proxy if available (for CORS on web).
async function fetchWithFallback(path: string): Promise<Response> {
  const rawUrl = buildRawUrl(path);

  // Try direct fetch (same-origin/local files or permissive CORS)
  try {
    const res = await fetch(rawUrl);
    if (res.ok) {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      // Reject HTML pages (SPAs return 200 HTML on missing routes)
      if (!ct.includes('text/html')) {
        return res;
      }
    }
  } catch (err) {
    // ignore and try proxy if available
  }

  // If running in a browser and a proxy URL is configured, try the proxy
  if (typeof window !== 'undefined' && PROXY_URL) {
    const proxyUrl = `${PROXY_URL}?path=${encodeURIComponent(rawUrl)}`;
    const res2 = await fetch(proxyUrl);
    if (res2.ok) return res2;
    throw new Error(`Failed to fetch via proxy: ${proxyUrl}`);
  }

  throw new Error(`Failed to fetch resource: ${rawUrl}`);
}

// ── Catalog fetch ─────────────────────────────────────────────────────────────

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetchWithFallback('catalog.json');
  if (!res.ok) throw new Error('Failed to fetch catalog');
  const raw = await res.json();
  return normalizeCatalog(raw);
}

// Normalize different catalog shapes (ekjv vs other exports) into our Catalog type
function normalizeCatalog(raw: any): Catalog {
  const booksRaw = raw.books || [];
  const books: CatalogBook[] = (booksRaw as any[]).map((b: any) => {
    const bookNumber = b.bookNumber ?? b.book_number ?? b.book_number ?? 0;
    const short_name = b.short_name ?? b.shortName ?? b.short ?? '';
    const long_name = b.long_name ?? b.longName ?? b.long ?? '';
    const name = b.name ?? long_name ?? short_name ?? '';
    const chapter_count = b.chapterCount ?? b.chapter_count ?? b.chapterCount ?? b.chapter_count ?? 0;
    const chapter_path_raw = b.chapter_path ?? b.chapterPath ?? b.chapterPath ?? b.chapter_path ?? b.path ?? b.file ?? `books/${bookNumber}.json`;
    const chapter_path = String(chapter_path_raw).replace(/^\/+/, '');
    const section_key = b.section_key ?? (bookNumber >= 470 ? 'nt' : 'ot');
    const available_chapters = b.available_chapters ?? b.availableChapters ?? Array.from({ length: Math.max(0, chapter_count) }, (_, i) => i + 1);

    return {
      slug: b.slug ?? String(bookNumber),
      name,
      short_name,
      long_name,
      section_key,
      book_number: Number(bookNumber),
      chapter_count: Number(chapter_count),
      available_chapters,
      chapter_path,
    } as CatalogBook;
  });

  return {
    version: {
      slug: raw.version?.slug ?? raw.info?.slug ?? 'unknown',
      label: raw.version?.label ?? raw.info?.description ?? raw.info?.detailed_info ?? 'Unknown',
      short_label: raw.version?.short_label ?? raw.info?.short_label ?? raw.info?.language ?? '',
      canon_type: raw.version?.canon_type ?? '',
    },
    available_books: books.map((b) => String(b.book_number)),
    books,
  };
}

// ── Book fetch + normalization ────────────────────────────────────────────────

const bookCache = new Map<number, BibleBookData>();

// Normalize ekjv book JSON (chapters[n].verses[{verse_number,text}])
// into the shared BibleBookData shape (versesByChapter[n][{verse,text}])
function normalizeEkjvBook(raw: any): BibleBookData {
  const versesByChapter: Record<string, BibleVerse[]> = {};
  const chapterMeta: BibleChapterMeta[] = [];

  // Handle multiple data shapes from different source exports.
  // 1) EKJV-style: raw.chapters is an object keyed by chapter, each with .verses array
  if (raw.chapters && !Array.isArray(raw.chapters)) {
    for (const [chKey, chData] of Object.entries(raw.chapters)) {
      const verses: BibleVerse[] = (chData.verses || []).map((v: any) => ({
        verse: v.verse_number ?? v.verse,
        text: v.text ?? v.content ?? '',
      }));
      versesByChapter[chKey] = verses;
      chapterMeta.push({ chapter: Number(chKey), verseCount: verses.length });
    }
  } else if (Array.isArray(raw.chapters) && raw.versesByChapter) {
    // 2) Numeric-export style: chapters is an array of meta, versesByChapter has arrays
    for (const ch of raw.chapters) {
      const chNum = Number(ch.chapter ?? ch.chapter_number);
      const versesRaw = raw.versesByChapter?.[String(chNum)] || [];
      const verses: BibleVerse[] = versesRaw.map((v: any) => ({ verse: v.verse ?? v.verse_number, text: v.text ?? v.content ?? '' }));
      versesByChapter[String(chNum)] = verses;
      chapterMeta.push({ chapter: chNum, verseCount: verses.length });
    }
  } else if (raw.versesByChapter) {
    // fallback if chapters meta absent
    for (const [chKey, versesRaw] of Object.entries(raw.versesByChapter)) {
      const verses: BibleVerse[] = (versesRaw as any[]).map((v: any) => ({ verse: v.verse ?? v.verse_number, text: v.text ?? v.content ?? '' }));
      versesByChapter[chKey] = verses;
      chapterMeta.push({ chapter: Number(chKey), verseCount: verses.length });
    }
  }

  chapterMeta.sort((a, b) => a.chapter - b.chapter);

  const b = raw.book || {};
  return {
    book: {
      bookNumber: (b.book_number as number) ?? (b.bookNumber as number) ?? 0,
      shortName:  (b.short_name as string) ?? (b.shortName as string) ?? '',
      longName:   (b.long_name as string) ?? (b.longName as string) ?? '',
      bookColor:  (b.bookColor as string) ?? '#ccccff',
      chapterCount: (b.chapter_count as number) ?? (b.chapterCount as number) ?? chapterMeta.length,
      verseCount: Object.values(versesByChapter).reduce((s, v) => s + v.length, 0),
    },
    chapters: chapterMeta,
    versesByChapter,
  };
}

export async function fetchBook(book: CatalogBook): Promise<BibleBookData> {
  const cached = bookCache.get(book.book_number);
  if (cached) return cached;

  const res = await fetchWithFallback(book.chapter_path);
  if (!res.ok) throw new Error(`Failed to fetch ${book.name}`);

  const raw = await res.json();
  const data = normalizeEkjvBook(raw);
  bookCache.set(book.book_number, data);
  return data;
}

// ── Verse helpers ─────────────────────────────────────────────────────────────

export function getVerses(bookData: BibleBookData, chapter: number): BibleVerse[] {
  return bookData.versesByChapter[String(chapter)] ?? [];
}

// ekjv text is already clean — strip any residual XML tags just in case
export function cleanVerseText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Section grouping ──────────────────────────────────────────────────────────

export type BibleSection = {
  key: string;
  label: string;
  books: CatalogBook[];
};

// Book numbers to move from dc → ec (Jubilees belongs to the Ethiopian canon)
const DC_TO_EC: Set<number> = new Set([746]);

export function groupIntoSections(books: CatalogBook[]): BibleSection[] {
  const groups: Record<string, CatalogBook[]> = { ot: [], nt: [], dc: [], ec: [] };
  for (const b of books) {
    const key = DC_TO_EC.has(b.book_number) ? 'ec' : b.section_key;
    groups[key]?.push(b);
  }
  return [
    { key: 'ot', label: 'Old Testament',   books: groups.ot },
    { key: 'nt', label: 'New Testament',   books: groups.nt },
    { key: 'dc', label: 'Apocryphal',      books: groups.dc },
    { key: 'ec', label: 'Ethiopian Canon', books: groups.ec },
  ];
}
