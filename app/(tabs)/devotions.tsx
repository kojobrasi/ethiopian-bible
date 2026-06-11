import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomTabBar from '@/components/BottomTabBar';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import devotionalData from '@/data/devotional.json';

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

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DevotionalEntry = {
  month: string;
  day: number;
  title: string;
  devotion: string;
  author?: string;
  source?: string;
  verse?: string;
  type?: string;
};

function stripHtml(html: string) {
  return html
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

function normalizeHtml(raw: string) {
  return (raw || '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

export default function DevotionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const currentMonthIndex = today.getMonth();
  const currentDay = today.getDate();

  const [monthIndex, setMonthIndex] = useState(currentMonthIndex);
  const [selectedDay, setSelectedDay] = useState(currentDay);

  const entries = devotionalData as DevotionalEntry[];
  const monthName = MONTHS[monthIndex];

  const daysInMonth = useMemo(() => {
    const year = today.getFullYear();
    return new Date(year, monthIndex + 1, 0).getDate();
  }, [monthIndex, today]);

  const firstDayOffset = useMemo(() => {
    const year = today.getFullYear();
    return new Date(year, monthIndex, 1).getDay();
  }, [monthIndex, today]);

  const selectedDayEntries = useMemo(() => {
    return entries.filter((entry) => entry.month === monthName && Number(entry.day) === selectedDay);
  }, [entries, monthName, selectedDay]);

  const dayCount = selectedDayEntries.length;

  const calendarCells = useMemo(() => {
    const leadEmpty = Array.from({ length: firstDayOffset }, () => null as number | null);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...leadEmpty, ...monthDays];
  }, [daysInMonth, firstDayOffset]);

  function changeMonth(direction: -1 | 1) {
    setMonthIndex((prev) => {
      const next = (prev + direction + 12) % 12;
      const nextDaysInMonth = new Date(today.getFullYear(), next + 1, 0).getDate();
      const nextDefaultDay = next === currentMonthIndex ? currentDay : 1;
      setSelectedDay(Math.min(nextDefaultDay, nextDaysInMonth));
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.titleRow}>
          <Heart size={18} color="#C0392B" fill="#C0392B" strokeWidth={1.5} />
          <Text style={styles.headerTitle}>Devotions</Text>
        </View>

        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
            <ChevronLeft size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{monthName}</Text>
          <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(1)}>
            <ChevronRight size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>{dayCount} devotion{dayCount === 1 ? '' : 's'} on {monthName} {selectedDay}</Text>
        </View>

        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d) => (
            <Text key={d} style={styles.weekCell}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const active = day === selectedDay;
            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[styles.dayCell, styles.dayButton, active && styles.dayButtonActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.listArea}>
        {selectedDayEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No devotion found for this date.</Text>
          </View>
        ) : (
          selectedDayEntries.map((entry, idx) => {
            const preview = stripHtml(normalizeHtml(entry.devotion || '')).slice(0, 50);
            const plainTitle = stripHtml(normalizeHtml(entry.title || 'Untitled'));
            const fullIndex = entries.findIndex(
              (sourceEntry) =>
                sourceEntry.month === entry.month &&
                Number(sourceEntry.day) === Number(entry.day) &&
                sourceEntry.title === entry.title,
            );

            return (
              <TouchableOpacity
                key={`${entry.month}-${entry.day}-${entry.title}-${idx}`}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/devotions/detail',
                    params: { index: String(fullIndex) },
                  })
                }
              >
                <Text style={styles.cardDate}>{entry.month} {entry.day}</Text>
                <Text style={styles.cardTitle}>{plainTitle}</Text>
                <Text style={styles.cardPreview}>{preview}{preview.length >= 50 ? '...' : ''}</Text>
                <Text style={styles.cardAuthor}>{entry.author || 'Unknown Author'}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  monthBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  badgeRow: { marginBottom: Spacing.sm },
  badgeText: {
    alignSelf: 'flex-start',
    fontSize: Typography.size.xs,
    color: '#E74C3C',
    backgroundColor: '#C0392B20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontWeight: Typography.weight.semibold,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  dayCell: { width: '13.1%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { borderRadius: Radius.full, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  dayButtonActive: { backgroundColor: '#C0392B20', borderColor: '#C0392B' },
  dayText: { fontSize: Typography.size.xs, color: Colors.text.secondary },
  dayTextActive: { color: '#E74C3C', fontWeight: Typography.weight.bold },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  listArea: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  emptyCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.lg,
  },
  emptyText: { fontSize: Typography.size.sm, color: Colors.text.muted },
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardDate: { fontSize: Typography.size.xs, color: Colors.text.muted, marginBottom: 4 },
  cardTitle: { fontSize: Typography.size.md, color: Colors.text.primary, fontWeight: Typography.weight.bold, marginBottom: 6 },
  cardPreview: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 8 },
  cardAuthor: { fontSize: Typography.size.xs, color: '#E74C3C', fontWeight: Typography.weight.semibold },
});
