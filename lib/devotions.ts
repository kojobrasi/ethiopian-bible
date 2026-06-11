export type DevotionalEntry = {
  month: string;
  day: number;
  title: string;
  devotion: string;
  author?: string;
  source?: string;
  verse?: string;
  type?: string;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function normalizeHtml(raw: string) {
  return (raw || '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

export function stripHtml(html: string) {
  return normalizeHtml(html)
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function getMonthName(date: Date) {
  return MONTHS[date.getMonth()];
}

export function getDevotionsForDate(entries: DevotionalEntry[], date: Date) {
  const month = getMonthName(date);
  const day = date.getDate();
  return entries.filter((entry) => entry.month === month && Number(entry.day) === day);
}

export function getVodSlot(date: Date) {
  return date.getHours() >= 18 ? 'evening' : 'morning';
}

export function getVerseOfDayEntry(entries: DevotionalEntry[], date: Date) {
  const dayEntries = getDevotionsForDate(entries, date);
  const slot = getVodSlot(date);
  const exact = dayEntries.find((entry) => (entry.type || '').toLowerCase() === slot);
  if (exact) return exact;

  const fallbackMorning = dayEntries.find((entry) => (entry.type || '').toLowerCase() === 'morning');
  const fallbackEvening = dayEntries.find((entry) => (entry.type || '').toLowerCase() === 'evening');
  return slot === 'morning' ? fallbackMorning || fallbackEvening || null : fallbackEvening || fallbackMorning || null;
}

export function getVerseOfDayIndex(entries: DevotionalEntry[], date: Date) {
  const entry = getVerseOfDayEntry(entries, date);
  if (!entry) return -1;
  return entries.findIndex(
    (item) =>
      item.month === entry.month &&
      Number(item.day) === Number(entry.day) &&
      item.title === entry.title &&
      item.type === entry.type,
  );
}

export function getVersePreview(entry: DevotionalEntry | null) {
  if (!entry) return '';
  return stripHtml(entry.verse || entry.devotion || '');
}

export function getVerseReference(entry: DevotionalEntry | null) {
  if (!entry) return '';
  const text = stripHtml(entry.verse || '');
  const parts = text.split(/\s+[—-]\s+/);
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return entry.source || '';
}

export function getPlainTitle(entry: DevotionalEntry | null) {
  if (!entry) return '';
  return stripHtml(entry.title || 'Untitled');
}

export function getVodNotificationKey(date: Date) {
  const slot = getVodSlot(date);
  const month = getMonthName(date);
  const day = date.getDate();
  return `vod_notified_${month}_${day}_${slot}`;
}
