import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

export type SavedBook = {
  id: string;
  title: string;
  fileName: string;
  fileType: 'epub' | 'pdf';
  fileUri: string;
  originalUri: string;
  addedAt: string;
  fileSize: number;
  currentPage?: number;
  totalPages?: number;
};

const SHELF_KEY = 'wol_reader_shelf';

function getReaderDir(): Directory {
  const dir = new Directory(Paths.document, 'reader');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}
export async function loadShelf(): Promise<SavedBook[]> {
  try {
    const raw = await AsyncStorage.getItem(SHELF_KEY);
    if (raw) return JSON.parse(raw) as SavedBook[];
  } catch {}
  return [];
}

async function saveShelf(books: SavedBook[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(books));
  } catch {}
}
export async function addBookToShelf(
  title: string,
  fileType: 'epub' | 'pdf',
  sourceUri: string,
  fileSize: number,
): Promise<SavedBook> {
  const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const readerDir = getReaderDir();
  const destFile = new File(readerDir, `${id}.${fileType}`);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);

  const book: SavedBook = {
    id,
    title: title || `Untitled ${fileType.toUpperCase()}`,
    fileName: `${id}.${fileType}`,
    fileType,
    fileUri: destFile.uri,
    originalUri: sourceUri,
    addedAt: new Date().toISOString(),
    fileSize,
  };

  const shelf = await loadShelf();
  shelf.unshift(book);
  await saveShelf(shelf);
  return book;
}

export async function removeBookFromShelf(bookId: string): Promise<void> {
  let shelf = await loadShelf();
  const book = shelf.find((b) => b.id === bookId);
  if (book) {
    try {
      const file = new File(book.fileUri);
      if (file.exists) file.delete();
    } catch {}
  }
  shelf = shelf.filter((b) => b.id !== bookId);
  await saveShelf(shelf);
}

export async function updateBookProgress(
  bookId: string,
  currentPage: number,
  totalPages?: number,
): Promise<void> {
  const shelf = await loadShelf();
  const idx = shelf.findIndex((b) => b.id === bookId);
  if (idx >= 0) {
    shelf[idx].currentPage = currentPage;
    if (totalPages !== undefined) shelf[idx].totalPages = totalPages;
    await saveShelf(shelf);
  }
}

export async function readBookContent(uri: string): Promise<string> {
  // Read the file via fetch for cross-platform base64
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: try expo-file-system File class
    try {
      const file = new File(uri);
      const text = await file.text();
      if (typeof btoa === 'function') return btoa(text);
      return text;
    } catch {}
    throw new Error('Could not read book file');
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

