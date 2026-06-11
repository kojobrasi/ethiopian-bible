/**
 * Scripture Linkification System
 *
 * Identifies Bible book references in any text and converts them to
 * tappable links that open the EKJV Bible app to the referenced passage.
 *
 * Supports many abbreviation variants for every book of the Bible (OT, NT, DC, EC).
 *
 * Usage:
 *   const html = linkifyScripture(userText);
 *   // Returns HTML with <a href='bible://open/...'> tags
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScriptureLink = {
  bookNumber: number;
  chapter: number;
  verse: number;
  /** Optional: end verse for ranges like "Gen 1:5-10" */
  endVerse?: number;
  /** The matched text */
  match: string;
  /** Start position in original text */
  start: number;
  /** End position in original text */
  end: number;
};

// ─── Book Registry ───────────────────────────────────────────────────────────

type BookEntry = {
  bookNumber: number;
  name: string;
  slug: string;
  abbreviations: string[];
};

const BOOKS: BookEntry[] = [
  // ── Old Testament ──
  { bookNumber: 10, name: 'Genesis', slug: 'gen', abbreviations: ['Gen', 'Ge', 'Genesis'] },
  { bookNumber: 20, name: 'Exodus', slug: 'ex', abbreviations: ['Exod', 'Ex', 'Exo', 'Exodus'] },
  { bookNumber: 30, name: 'Leviticus', slug: 'lev', abbreviations: ['Lev', 'Le', 'Levi', 'Leviticus'] },
  { bookNumber: 40, name: 'Numbers', slug: 'num', abbreviations: ['Num', 'Nu', 'Numb', 'Numbers'] },
  { bookNumber: 50, name: 'Deuteronomy', slug: 'deut', abbreviations: ['Deut', 'De', 'Deu', 'Deuteronomy'] },
  { bookNumber: 60, name: 'Joshua', slug: 'josh', abbreviations: ['Josh', 'Jos', 'Joshua'] },
  { bookNumber: 70, name: 'Judges', slug: 'judg', abbreviations: ['Judg', 'Jdg', 'Jdgs', 'Judges'] },
  { bookNumber: 80, name: 'Ruth', slug: 'ruth', abbreviations: ['Ruth', 'Ru'] },
  { bookNumber: 90, name: '1 Samuel', slug: '1sam', abbreviations: ['1 Sam', '1 Sam.', '1Sam', '1 Sa', '1Sa', '1 Samuel'] },
  { bookNumber: 100, name: '2 Samuel', slug: '2sam', abbreviations: ['2 Sam', '2 Sam.', '2Sam', '2 Sa', '2Sa', '2 Samuel'] },
  { bookNumber: 110, name: '1 Kings', slug: '1kgs', abbreviations: ['1 Kgs', '1Kgs', '1 Ki', '1Ki', '1 Kings'] },
  { bookNumber: 120, name: '2 Kings', slug: '2kgs', abbreviations: ['2 Kgs', '2Kgs', '2 Ki', '2Ki', '2 Kings'] },
  { bookNumber: 130, name: '1 Chronicles', slug: '1chr', abbreviations: ['1 Chr', '1Chr', '1 Ch', '1Ch', '1 Chron', '1 Chronicles'] },
  { bookNumber: 140, name: '2 Chronicles', slug: '2chr', abbreviations: ['2 Chr', '2Chr', '2 Ch', '2Ch', '2 Chron', '2 Chronicles'] },
  { bookNumber: 150, name: 'Ezra', slug: 'ezra', abbreviations: ['Ezra', 'Ezr', 'Ez'] },
  { bookNumber: 160, name: 'Nehemiah', slug: 'neh', abbreviations: ['Neh', 'Ne', 'Nehemiah'] },
  { bookNumber: 190, name: 'Esther', slug: 'esth', abbreviations: ['Esth', 'Est', 'Es', 'Esther'] },
  { bookNumber: 220, name: 'Job', slug: 'job', abbreviations: ['Job'] },
  { bookNumber: 230, name: 'Psalms', slug: 'ps', abbreviations: ['Ps', 'Psa', 'Psm', 'Pss', 'Psalm', 'Psalms'] },
  { bookNumber: 240, name: 'Proverbs', slug: 'prov', abbreviations: ['Prov', 'Pro', 'Pr', 'Proverbs'] },
  { bookNumber: 250, name: 'Ecclesiastes', slug: 'eccl', abbreviations: ['Eccl', 'Ecc', 'Ec', 'Ecclesiastes'] },
  { bookNumber: 260, name: 'Song of Solomon', slug: 'sos', abbreviations: ['Song', 'So', 'SOS', 'Song of Sol', 'Song of Solomon'] },
  { bookNumber: 290, name: 'Isaiah', slug: 'isa', abbreviations: ['Isa', 'Is', 'Isaiah'] },
  { bookNumber: 300, name: 'Jeremiah', slug: 'jer', abbreviations: ['Jer', 'Je', 'Jeremiah'] },
  { bookNumber: 310, name: 'Lamentations', slug: 'lam', abbreviations: ['Lam', 'La', 'Lamentations'] },
  { bookNumber: 330, name: 'Ezekiel', slug: 'ezek', abbreviations: ['Ezek', 'Eze', 'Ezekiel'] },
  { bookNumber: 340, name: 'Daniel', slug: 'dan', abbreviations: ['Dan', 'Da', 'Dnl', 'Daniel'] },
  { bookNumber: 350, name: 'Hosea', slug: 'hos', abbreviations: ['Hos', 'Ho', 'Hosea'] },
  { bookNumber: 360, name: 'Joel', slug: 'joel', abbreviations: ['Joel', 'Joe'] },
  { bookNumber: 370, name: 'Amos', slug: 'amos', abbreviations: ['Amos', 'Am', 'Amo'] },
  { bookNumber: 380, name: 'Obadiah', slug: 'obad', abbreviations: ['Obad', 'Ob', 'Oba', 'Obadiah'] },
  { bookNumber: 390, name: 'Jonah', slug: 'jonah', abbreviations: ['Jonah', 'Jon', 'Jnh'] },
  { bookNumber: 400, name: 'Micah', slug: 'mic', abbreviations: ['Mic', 'Mi', 'Micah'] },
  { bookNumber: 410, name: 'Nahum', slug: 'nah', abbreviations: ['Nah', 'Na', 'Nahum'] },
  { bookNumber: 420, name: 'Habakkuk', slug: 'hab', abbreviations: ['Hab', 'Ha', 'Habakkuk'] },
  { bookNumber: 430, name: 'Zephaniah', slug: 'zeph', abbreviations: ['Zeph', 'Zep', 'Zephaniah'] },
  { bookNumber: 440, name: 'Haggai', slug: 'hag', abbreviations: ['Hag', 'Ha', 'Haggai'] },
  { bookNumber: 450, name: 'Zechariah', slug: 'zech', abbreviations: ['Zech', 'Zec', 'Zechariah'] },
  { bookNumber: 460, name: 'Malachi', slug: 'mal', abbreviations: ['Mal', 'Ml', 'Malachi'] },

  // ── New Testament ──
  { bookNumber: 470, name: 'Matthew', slug: 'matt', abbreviations: ['Matt', 'Mt', 'Mat', 'Matthew'] },
  { bookNumber: 480, name: 'Mark', slug: 'mark', abbreviations: ['Mark', 'Mk', 'Mrk'] },
  { bookNumber: 490, name: 'Luke', slug: 'luke', abbreviations: ['Luke', 'Lk', 'Luk'] },
  { bookNumber: 500, name: 'John', slug: 'john', abbreviations: ['John', 'Jn', 'Joh'] },
  { bookNumber: 510, name: 'Acts', slug: 'acts', abbreviations: ['Acts', 'Act', 'Ac'] },

  { bookNumber: 520, name: 'Romans', slug: 'rom', abbreviations: ['Rom', 'Ro', 'Romans'] },
  { bookNumber: 530, name: '1 Corinthians', slug: '1cor', abbreviations: ['1 Cor', '1Cor', '1 Co', '1Co', '1 Corinthians'] },
  { bookNumber: 540, name: '2 Corinthians', slug: '2cor', abbreviations: ['2 Cor', '2Cor', '2 Co', '2Co', '2 Corinthians'] },
  { bookNumber: 550, name: 'Galatians', slug: 'gal', abbreviations: ['Gal', 'Ga', 'Galatians'] },
  { bookNumber: 560, name: 'Ephesians', slug: 'eph', abbreviations: ['Eph', 'Ep', 'Ephesians'] },
  { bookNumber: 570, name: 'Philippians', slug: 'phil', abbreviations: ['Phil', 'Php', 'Philippians'] },
  { bookNumber: 580, name: 'Colossians', slug: 'col', abbreviations: ['Col', 'Co', 'Colossians'] },
  { bookNumber: 590, name: '1 Thessalonians', slug: '1thess', abbreviations: ['1 Thess', '1Thess', '1 Thes', '1Thes', '1 Th', '1Th', '1 Thessalonians'] },
  { bookNumber: 600, name: '2 Thessalonians', slug: '2thess', abbreviations: ['2 Thess', '2Thess', '2 Thes', '2Thes', '2 Th', '2Th', '2 Thessalonians'] },
  { bookNumber: 610, name: '1 Timothy', slug: '1tim', abbreviations: ['1 Tim', '1Tim', '1 Ti', '1Ti', '1 Timothy'] },
  { bookNumber: 620, name: '2 Timothy', slug: '2tim', abbreviations: ['2 Tim', '2Tim', '2 Ti', '2Ti', '2 Timothy'] },
  { bookNumber: 630, name: 'Titus', slug: 'tit', abbreviations: ['Titus', 'Tit', 'Ti'] },
  { bookNumber: 640, name: 'Philemon', slug: 'phlm', abbreviations: ['Philemon', 'Phm', 'Phile'] },
  { bookNumber: 650, name: 'Hebrews', slug: 'heb', abbreviations: ['Heb', 'He', 'Hebrews'] },
  { bookNumber: 660, name: 'James', slug: 'jas', abbreviations: ['James', 'Jas', 'Ja'] },
  { bookNumber: 670, name: '1 Peter', slug: '1pet', abbreviations: ['1 Pet', '1Pet', '1 Pe', '1Pe', '1 Peter'] },
  { bookNumber: 680, name: '2 Peter', slug: '2pet', abbreviations: ['2 Pet', '2Pet', '2 Pe', '2Pe', '2 Peter'] },
  { bookNumber: 690, name: '1 John', slug: '1jn', abbreviations: ['1 Jn', '1Jn', '1 Jo', '1Jo', '1 Joh', '1John', '1 John'] },
  { bookNumber: 700, name: '2 John', slug: '2jn', abbreviations: ['2 Jn', '2Jn', '2 Jo', '2Jo', '2 Joh', '2 John'] },
  { bookNumber: 710, name: '3 John', slug: '3jn', abbreviations: ['3 Jn', '3Jn', '3 Jo', '3Jo', '3 Joh', '3 John'] },
  { bookNumber: 720, name: 'Jude', slug: 'jude', abbreviations: ['Jude', 'Jud'] },
  { bookNumber: 730, name: 'Revelation', slug: 'rev', abbreviations: ['Rev', 'Re', 'Revelation', 'Revelations'] },

  // ── Deuterocanon / Ethiopian Canon ──
  { bookNumber: 731, name: '1 Esdras', slug: '1esd', abbreviations: ['1 Esd', '1Esd', '1 Es', '1Es', '1 Esdras'] },
  { bookNumber: 732, name: '2 Esdras', slug: '2esd', abbreviations: ['2 Esd', '2Esd', '2 Es', '2Es', '2 Esdras'] },
  { bookNumber: 733, name: 'Tobit', slug: 'tob', abbreviations: ['Tobit', 'Tob', 'To'] },
  { bookNumber: 734, name: 'Judith', slug: 'jdt', abbreviations: ['Judith', 'Jdt', 'Jd'] },
  { bookNumber: 735, name: 'Additions to Esther', slug: 'aes', abbreviations: ['Add Est', 'Additions to Esther'] },
  { bookNumber: 736, name: 'Wisdom of Solomon', slug: 'wis', abbreviations: ['Wis', 'Wsd', 'Wisdom', 'Wisdom of Solomon'] },
  { bookNumber: 737, name: 'Sirach', slug: 'sir', abbreviations: ['Sirach', 'Sir', 'Si', 'Ecclesiasticus'] },
  { bookNumber: 738, name: 'Baruch', slug: 'bar', abbreviations: ['Baruch', 'Bar', 'Ba'] },
  { bookNumber: 739, name: 'Epistle of Jeremy', slug: 'epjer', abbreviations: ['Ep Jer', 'EpJer', 'Epistle of Jeremy'] },
  { bookNumber: 740, name: 'Prayer of Azariah', slug: 'praz', abbreviations: ['Pr Az', 'PrAz', 'Prayer of Azariah'] },
  { bookNumber: 741, name: 'Susanna', slug: 'sus', abbreviations: ['Susanna', 'Sus', 'Su'] },
  { bookNumber: 742, name: 'Bel and the Dragon', slug: 'bel', abbreviations: ['Bel', 'Bel and the Dragon'] },
  { bookNumber: 743, name: 'Prayer of Manasseh', slug: 'prman', abbreviations: ['Pr Man', 'PrMan', 'Prayer of Manasseh'] },
  { bookNumber: 744, name: '1 Maccabees', slug: '1macc', abbreviations: ['1 Macc', '1Macc', '1 Mac', '1Mac', '1 Ma', '1Ma', '1 Maccabees'] },
  { bookNumber: 745, name: '2 Maccabees', slug: '2macc', abbreviations: ['2 Macc', '2Macc', '2 Mac', '2Mac', '2 Ma', '2Ma', '2 Maccabees'] },
  { bookNumber: 746, name: 'Jubilees', slug: 'jub', abbreviations: ['Jubilees', 'Jub'] },
  { bookNumber: 747, name: '1 Enoch', slug: '1enoch', abbreviations: ['1 Enoch', '1 En', '1Enoch', '1 Book of Enoch'] },
  { bookNumber: 748, name: '2 Enoch', slug: '2enoch', abbreviations: ['2 Enoch', '2 En', '2Enoch', '2 Book of Enoch'] },
  { bookNumber: 749, name: 'Jasher', slug: 'jasher', abbreviations: ['Jasher', 'Jash', 'Book of Jasher'] },
  { bookNumber: 750, name: '1 Meqabyan', slug: '1meq', abbreviations: ['1 Meq', '1Meq', '1 Meqabyan'] },
  { bookNumber: 751, name: '2 Meqabyan', slug: '2meq', abbreviations: ['2 Meq', '2Meq', '2 Meqabyan'] },
  { bookNumber: 752, name: '3 Meqabyan', slug: '3meq', abbreviations: ['3 Meq', '3Meq', '3 Meqabyan'] },
  { bookNumber: 753, name: 'Psalms 151', slug: 'ps151', abbreviations: ['Ps 151', 'Ps151', 'Psa 151', 'Psa151'] },
  { bookNumber: 754, name: '1 Clement', slug: '1clem', abbreviations: ['1 Clem', '1Clem', '1 Cl', '1Cl', '1 Letter of Clement'] },
  { bookNumber: 755, name: '2 Clement', slug: '2clem', abbreviations: ['2 Clem', '2Clem', '2 Cl', '2Cl', '2 Letter of Clement'] },
];

// ─── Build lookup maps ───────────────────────────────────────────────────────
// (now handled inline in buildAbbrevMap() below)

// ─── Regex Patterns ──────────────────────────────────────────────────────────

/**
 * Build a sorted list of all book name patterns (longest first),
 * handling the fact that some start with digits.
 *
 * We use a TWO-PHASE approach:
 *   Phase 1: Match potential chapter:verse patterns like "1:2", "1:5-10"
 *   Phase 2: Look backwards from that match to find the book name
 *
 * This avoids the complexity of matching book names with word boundaries
 * when they contain digits (e.g., "1 John", "2 Pet")
 */

/**
 * Regex to find potential chapter:verse or chapter references.
 *
 * Matches patterns like:
 *   1:2        -> chapter=1, verse=2
 *   1:5-10     -> chapter=1, verse=5, endVerse=10
 *   3          -> chapter=3 (book only, no verse)
 *
 * We match these and then scan backwards to find the book name.
 */
const CHAPTER_VERSE_REGEX = /(\d{1,3})(?::(\d{1,3}))?(?:-(\d{1,3}))?\b/g;

/**
 * Build a map of all abbreviation variants keyed by their normalized form.
 * Normalization: lowercase, remove periods, remove spaces.
 */
function buildAbbrevMap(): Map<string, BookEntry> {
  const map = new Map<string, BookEntry>();

  for (const book of BOOKS) {
    for (const abbr of book.abbreviations) {
      const key = abbr.toLowerCase().replace(/[.\s]/g, '');
      if (!map.has(key)) {
        map.set(key, book);
      }
    }
    // Map by slug (no prefix digits issue)
    map.set(book.slug.toLowerCase(), book);
    // Map by name normalized
    const nameKey = book.name.toLowerCase().replace(/[.\s]/g, '');
    map.set(nameKey, book);
  }

  return map;
}

const abbrevMap = buildAbbrevMap();

/**
 * Try to find a book name at a given position, scanning backwards.
 * Returns the book and the actual start/end of the book name text.
 * Finds the CLOSEST matching abbreviation to the target position.
 */
function findBookAtPosition(
  text: string,
  endPos: number,
): { book: BookEntry; matchStart: number; matchEnd: number } | null {
  const searchStart = Math.max(0, endPos - 40);
  const before = text.slice(searchStart, endPos);

  let bestMatch: { book: BookEntry; matchStart: number; matchEnd: number; distance: number; abbrLen: number } | null = null;

  for (const book of BOOKS) {
    for (const abbr of book.abbreviations) {
      // Find the LAST (rightmost) occurrence in `before` that ends at or before `endPos`
      let searchFrom = before.toLowerCase().length;
      let foundAt = -1;
      while (searchFrom >= 0) {
        const idx = before.toLowerCase().lastIndexOf(abbr.toLowerCase(), searchFrom);
        if (idx === -1) break;
        foundAt = idx;
        break; // lastIndexOf already gives rightmost
      }

      if (foundAt === -1) continue;

      const matchStart = searchStart + foundAt;
      const matchEnd = matchStart + abbr.length;

      // Must not go past endPos
      if (matchEnd > endPos) continue;

      // Ensure the book name is at a word boundary
      const charBefore = matchStart > 0 ? text[matchStart - 1] : ' ';
      if (!/[\s(,[\]{<>\n\r\t'"]/.test(charBefore) && charBefore !== undefined) continue;

      // Ensure the book name is followed by space, period, colon, or end of string
      const charAfter = matchEnd < text.length ? text[matchEnd] : ' ';
      if (!/[\s.:;,?!]/.test(charAfter) && matchEnd !== text.length) continue;

      const distance = endPos - matchEnd;
      // Prefer closer matches; for equal distances, prefer longer abbreviation (more specific)
      const abbrLen = abbr.length;
      if (!bestMatch || distance < bestMatch.distance || (distance === bestMatch.distance && abbrLen > (bestMatch.abbrLen || 0))) {
        bestMatch = { book, matchStart, matchEnd, distance, abbrLen };
      }
    }
  }

  return bestMatch ? { book: bestMatch.book, matchStart: bestMatch.matchStart, matchEnd: bestMatch.matchEnd } : null;
}

// ─── Linkification ───────────────────────────────────────────────────────────

/**
 * Parse all scripture references in a string.
 *
 * Strategy:
 * 1. Find all chapter:verse patterns (e.g., "1:2", "3:16-17")
 * 2. For each, scan backwards to find the book name
 * 3. If found, record the full reference
 */
export function findScriptureReferences(text: string): ScriptureLink[] {
  const links: ScriptureLink[] = [];
  const matches: { matchIndex: number; match: RegExpExecArray }[] = [];

  // Phase 1: Find all potential chapter:verse references
  CHAPTER_VERSE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHAPTER_VERSE_REGEX.exec(text)) !== null) {
    matches.push({ matchIndex: m.index, match: m });
  }

  // Sort by position
  matches.sort((a, b) => a.matchIndex - b.matchIndex);

  for (const { matchIndex, match: m } of matches) {
    const chapter = parseInt(m[1], 10);
    const verse = m[2] ? parseInt(m[2], 10) : 1;
    const endVerse = m[3] ? parseInt(m[3], 10) : undefined;

    // Only treat standalone chapter refs (no :verse) as valid if preceded by a book
    const hasColon = matchIndex > 0 && text[matchIndex - 1] === ':';
    if (!m[2] && !hasColon) {
      // This is just a number alone — only treat as a reference if preceded by a book
      const bookInfo = findBookAtPosition(text, matchIndex);
      if (bookInfo) {
        links.push({
          bookNumber: bookInfo.book.bookNumber,
          chapter,
          verse: 1,
          endVerse: undefined,
          match: text.slice(bookInfo.matchStart, matchIndex + m[0].length).trim(),
          start: bookInfo.matchStart,
          end: matchIndex + m[0].length,
        });
      }
      continue;
    }

    // Check if preceded by a book name
    const bookInfo = findBookAtPosition(text, matchIndex);
    if (bookInfo) {
      // Validate
      if (chapter < 1 || chapter > 200) continue;
      if (verse < 1 || verse > 200) continue;
      if (endVerse !== undefined && (endVerse < verse || endVerse > 200)) continue;

      // Only count if the book name is directly before the colon/number
      // (allowing for a space between book name and chapter)
      const afterBook = text.slice(bookInfo.matchEnd, matchIndex).trim();
      if (afterBook.length > 5) continue; // Too much text between book and number

      links.push({
        bookNumber: bookInfo.book.bookNumber,
        chapter,
        verse,
        endVerse,
        match: text.slice(bookInfo.matchStart, matchIndex + m[0].length).trim(),
        start: bookInfo.matchStart,
        end: matchIndex + m[0].length,
      });
    }
  }

  // Sort by start position and merge/deduplicate overlapping matches
  links.sort((a, b) => a.start - b.start);
  const filtered: ScriptureLink[] = [];
  for (const link of links) {
    if (filtered.length > 0) {
      const last = filtered[filtered.length - 1];
      // If this link overlaps or is contained within the last one, skip it
      if (link.start < last.end) continue;
    }
    filtered.push(link);
  }

  return filtered;
}

/**
 * Convert a single scripture reference to a deep-link URL.
 * Format: bible://open/{bookNumber}/{chapter}?verse={verse}
 */
export function scriptureToUrl(link: ScriptureLink): string {
  return `bible://open/${link.bookNumber}/${link.chapter}?verse=${link.verse}${link.endVerse ? `&endVerse=${link.endVerse}` : ''}`;
}

/**
 * Convert a scripture reference to an app-internal navigation path.
 * Format: /bible?book={bookNumber}&chapter={chapter}&verse={verse}
 */
export function scriptureToNavPath(link: ScriptureLink): string {
  return `/bible?book=${link.bookNumber}&chapter=${link.chapter}&verse=${link.verse}${link.endVerse ? `&endVerse=${link.endVerse}` : ''}`;
}

/**
 * Linkify a plain text string — wraps all scripture references in
 * clickable HTML anchor tags.
 *
 * @param text - Plain text to scan
 * @returns HTML with <a> tags for scripture links
 */
export function linkifyScriptureToHtml(text: string): string {
  // First escape any existing HTML entities to prevent XSS
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const links = findScriptureReferences(escaped);

  if (links.length === 0) return escaped;

  // Build result by replacing matched sections
  const parts: string[] = [];
  let lastIndex = 0;

  for (const link of links) {
    // Add text before this match
    if (link.start > lastIndex) {
      parts.push(escaped.slice(lastIndex, link.start));
    }

    const ref = escaped.slice(link.start, link.end);
    const url = scriptureToUrl(link);
    const navPath = scriptureToNavPath(link);

    // Create an anchor that can be tapped
    parts.push(
      `<a href="${url}" data-bible-ref="${navPath}" class="scripture-link" ` +
      `style="color:#C8A84B;text-decoration:underline;cursor:pointer;" ` +
      `onclick="event.preventDefault(); window.ReactNativeWebView.postMessage(JSON.stringify({type:'bibleRef', ref:'${navPath}'}))">` +
      `${ref}</a>`,
    );

    lastIndex = link.end;
  }

  // Add remaining text
  if (lastIndex < escaped.length) {
    parts.push(escaped.slice(lastIndex));
  }

  return parts.join('');
}

/**
 * Get book info from book number (for display in tooltip, etc.)
 */
export function getBookInfo(bookNumber: number): BookEntry | undefined {
  return BOOKS.find((b) => b.bookNumber === bookNumber);
}
