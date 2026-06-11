import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCatalog,
  fetchBook,
  getVerses,
  cleanVerseText,
  setBibleBaseUrl,
  clearBookCache,
  type Catalog,
  type CatalogBook,
  type BibleBookData,
} from '@/lib/bible';

export type ReaderVerse = {
  verse: number;
  text: string;
};

export type BibleReaderState = {
  catalog: Catalog | null;
  currentBook: CatalogBook | null;
  bookData: BibleBookData | null;
  chapter: number;
  verses: ReaderVerse[];
  loadingCatalog: boolean;
  loadingChapter: boolean;
  error: string | null;
  setBook: (book: CatalogBook) => void;
  setChapter: (n: number) => void;
  goNextChapter: () => void;
  goPrevChapter: () => void;
};

export function useBibleReader(
  initialBookNumber = 500,
  initialChapter = 1,
  versionBaseUrl = '/data/ekjv',
): BibleReaderState {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [currentBook, setCurrentBook] = useState<CatalogBook | null>(null);
  const [bookData, setBookData] = useState<BibleBookData | null>(null);
  const [chapter, setChapterState] = useState(initialChapter);
  const [verses, setVerses] = useState<ReaderVerse[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentBookRef = useRef<CatalogBook | null>(null);

  // Reload catalog whenever the version URL changes (or on first mount)
  useEffect(() => {
    // Sync module-level BASE_URL and clear stale cache
    setBibleBaseUrl(versionBaseUrl);
    clearBookCache();

    // Reset all state for the new version
    setCatalog(null);
    setCurrentBook(null);
    setBookData(null);
    setVerses([]);
    setChapterState(initialChapter);
    setError(null);
    setLoadingCatalog(true);

    fetchCatalog()
      .then((cat) => {
        setCatalog(cat);
        const book = cat.books.find((b) => b.book_number === initialBookNumber) ?? cat.books[0];
        setCurrentBook(book);
        currentBookRef.current = book;
        setLoadingCatalog(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingCatalog(false);
      });
  }, [versionBaseUrl]);

  // Fetch book data whenever the selected book changes
  useEffect(() => {
    if (!currentBook) return;
    setLoadingChapter(true);
    setError(null);
    setBookData(null);
    fetchBook(currentBook)
      .then((data) => {
        setBookData(data);
        setLoadingChapter(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingChapter(false);
      });
  }, [currentBook]);

  // Populate verses whenever bookData or chapter changes
  useEffect(() => {
    if (!bookData) return;
    const raw = getVerses(bookData, chapter);
    setVerses(raw.map((v) => ({ verse: v.verse, text: cleanVerseText(v.text) })));
  }, [bookData, chapter]);

  const setBook = useCallback((book: CatalogBook) => {
    setCurrentBook(book);
    currentBookRef.current = book;
    setChapterState(1);
    setError(null);
  }, []);

  const setChapter = useCallback((n: number) => {
    const max = currentBookRef.current?.chapter_count ?? 1;
    setChapterState(Math.max(1, Math.min(n, max)));
  }, []);

  const goNextChapter = useCallback(() => {
    const max = currentBookRef.current?.chapter_count ?? 1;
    setChapterState((c) => (c >= max ? c : c + 1));
  }, []);

  const goPrevChapter = useCallback(() => {
    setChapterState((c) => Math.max(1, c - 1));
  }, []);

  return {
    catalog,
    currentBook,
    bookData,
    chapter,
    verses,
    loadingCatalog,
    loadingChapter,
    error,
    setBook,
    setChapter,
    goNextChapter,
    goPrevChapter,
  };
}
