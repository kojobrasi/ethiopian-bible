import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DevotionalEntry } from '@/lib/devotions';
import { getMonthName, getVodSlot, getVerseOfDayEntry, getVerseOfDayIndex, getVersePreview, getVerseReference } from '@/lib/devotions';

const VOD_NOTIFICATION_PREFIX = 'vod-';

export function isNativeNotificationsSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function configureNotifications() {
  if (!isNativeNotificationsSupported()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions() {
  if (!isNativeNotificationsSupported()) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync();
  return !!next.granted || next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

function buildOccurrenceDate(month: string, day: number, hour: number) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = [
    'January','February','March','April','May','June','July','August','September','October','November','December',
  ].indexOf(month);

  if (monthIndex < 0) return null;

  const candidate = new Date(year, monthIndex, day, hour, 0, 0, 0);
  if (candidate.getTime() > now.getTime()) return candidate;
  return new Date(year + 1, monthIndex, day, hour, 0, 0, 0);
}

function uniqueVodEntries(entries: DevotionalEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const slot = (entry.type || '').toLowerCase();
    const key = `${entry.month}-${entry.day}-${slot}-${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return slot === 'morning' || slot === 'evening';
  });
}

export async function clearScheduledVerseOfDayNotifications() {
  if (!isNativeNotificationsSupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const vodIds = scheduled
    .filter((item) => String(item.content.data?.kind || '').startsWith(VOD_NOTIFICATION_PREFIX))
    .map((item) => item.identifier);

  await Promise.all(vodIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleVerseOfDayNotifications(entries: DevotionalEntry[], enabled: boolean) {
  if (!isNativeNotificationsSupported()) return;

  await clearScheduledVerseOfDayNotifications();
  if (!enabled) return;

  const allowed = await requestNotificationPermissions();
  if (!allowed) return;

  const candidates = uniqueVodEntries(entries);

  for (const entry of candidates) {
    const slot = (entry.type || '').toLowerCase();
    const hour = slot === 'evening' ? 18 : 0;
    const when = buildOccurrenceDate(entry.month, Number(entry.day), hour);
    if (!when) continue;

    const index = getVerseOfDayIndex(entries, when);
    const title = `${slot === 'evening' ? 'Evening' : 'Morning'} Verse of the Day`;
    const verseText = getVersePreview(entry).slice(0, 180);
    const verseRef = getVerseReference(entry);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: verseRef ? `${verseText} — ${verseRef}` : verseText,
        data: {
          kind: `${VOD_NOTIFICATION_PREFIX}${slot}`,
          devotionalIndex: index,
          month: entry.month,
          day: entry.day,
          slot,
        },
      },
      trigger: new Date(when),
    });
  }
}

export function resolveCurrentVod(entries: DevotionalEntry[], date: Date) {
  const entry = getVerseOfDayEntry(entries, date);
  const index = getVerseOfDayIndex(entries, date);
  const slot = getVodSlot(date);
  const month = getMonthName(date);
  return { entry, index, slot, month, day: date.getDate() };
}
