import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen, BookText, BookMarked, Heart, Play,
  Globe, HelpCircle, Share2, Star, Settings,
  Sparkles, LayoutGrid,
} from 'lucide-react-native';

import data from '@/data/data.json';
import MenuButton from '@/components/MenuButton';
import ResourceCard from '@/components/ResourceCard';
import FeaturedCard from '@/components/FeaturedCard';
import SectionHeader from '@/components/SectionHeader';
import BottomTabBar from '@/components/BottomTabBar';
import AdBanner from '@/components/AdBanner';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import devotionalData from '@/data/devotional.json';
import {
  getPlainTitle,
  getVerseOfDayEntry,
  getVerseOfDayIndex,
  getVersePreview,
  getVerseReference,
  type DevotionalEntry,
} from '@/lib/devotions';
import { useAppSettings } from '@/contexts/AppContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type MenuItem = {
  id: string;
  label: string;
  icon: typeof BookOpen;
  color: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'bible', label: 'BIBLE', icon: BookOpen, color: Colors.gold.primary, route: '/bible' },
  { id: 'reader', label: 'READER', icon: BookText, color: '#3A7BD5', route: '/reader' },
  { id: 'dictionary', label: 'DICTIONARY', icon: BookMarked, color: '#2A7B7A', route: '/dictionary' },
  { id: 'devotions', label: 'DEVOTIONS', icon: Heart, color: '#C0392B', route: '/(tabs)/devotions' },
  { id: 'media', label: 'MEDIA', icon: Play, color: '#8E44AD', route: '/media' },
  { id: 'resources', label: 'RESOURCES', icon: Globe, color: '#27AE60', route: '/resources' },
  { id: 'quizzes', label: 'QUIZZES', icon: HelpCircle, color: '#E67E22', route: '/quizzes' },
  { id: 'share', label: 'SHARE', icon: Share2, color: '#2980B9', route: '/share' },
  { id: 'rate', label: 'RATE', icon: Star, color: '#F39C12', route: '/rate' },
  { id: 'settings', label: 'SETTINGS', icon: Settings, color: '#95A5A6', route: '/(tabs)/settings' },
];

const MENU_ROWS = [MENU_ITEMS.slice(0, 5), MENU_ITEMS.slice(5, 10)];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  const scheduledVodKeyRef = useRef<string | null>(null);
  const { pushNotifications, verseOfDayNotifications } = useAppSettings();

  const hPad = Spacing.lg;
  const cardGap = Spacing.md;
  const numCols = width < 600 ? 2 : width < 900 ? 3 : 4;
  const cardWidth = useMemo(
    () => (width - hPad * 2 - cardGap * (numCols - 1)) / numCols,
    [width, numCols],
  );
  const menuBtnSize = useMemo(() => (width - hPad * 2) / 5, [width]);

  const featuredItems = useMemo(() => data.filter((d) => d.featured), []);
  const devotionalEntries = devotionalData as DevotionalEntry[];

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const vodEntry = useMemo(() => getVerseOfDayEntry(devotionalEntries, now), [devotionalEntries, now]);
  const vodIndex = useMemo(() => getVerseOfDayIndex(devotionalEntries, now), [devotionalEntries, now]);
  const vodTitle = useMemo(() => getPlainTitle(vodEntry), [vodEntry]);
  const vodVerse = useMemo(() => getVersePreview(vodEntry), [vodEntry]);
  const vodReference = useMemo(() => getVerseReference(vodEntry), [vodEntry]);
  const vodSubtitle = useMemo(() => (vodEntry?.type === 'evening' ? 'Evening Devotion' : 'Morning Devotion'), [vodEntry]);

  useEffect(() => {
    if (!pushNotifications || !verseOfDayNotifications) {
      return;
    }

    let isMounted = true;

    const ensureNotificationPermission = async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) {
        await Notifications.requestPermissionsAsync();
      }
    };

    void ensureNotificationPermission();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const devotionIndex = response.notification.request.content.data?.devotionIndex;
      if (typeof devotionIndex === 'number' || typeof devotionIndex === 'string') {
        router.push({ pathname: '/devotions/detail', params: { index: String(devotionIndex) } });
      }
    });

    const scheduleVodNotification = async () => {
      const devotionIndex = vodIndex;
      if (devotionIndex === null || devotionIndex < 0) {
        return;
      }

      const notificationKey = `${vodSubtitle}-${devotionIndex}`;
      if (scheduledVodKeyRef.current === notificationKey) {
        return;
      }

      scheduledVodKeyRef.current = notificationKey;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: vodSubtitle,
          body: `${vodTitle}${vodReference ? ` - ${vodReference}` : ''}`,
          data: { devotionIndex },
        },
        trigger: { seconds: 2 },
      });
    };

    void scheduleVodNotification();

    return () => {
      isMounted = false;
      subscription.remove();
      if (!isMounted) {
        return;
      }
    };
  }, [pushNotifications, verseOfDayNotifications, vodEntry, vodReference, vodSubtitle, vodTitle]);
  const handleMenuPress = useCallback(
    (item: MenuItem) => {
      router.push(item.route as any);
    },
    [router],
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={[Colors.bg.secondary, Colors.bg.primary]}
          style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
        >
          <View style={styles.headerInner}>
            <View style={styles.logoArea}>
              <View style={styles.logoIcon}>
                <BookOpen size={20} color={Colors.gold.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.appName}>WORD OF LIFE</Text>
                <Text style={styles.appDate}>{today}</Text>
              </View>
            </View>
          </View>

          {/* Verse of Day strip */}
          <TouchableOpacity
            style={styles.votdStrip}
            activeOpacity={0.9}
            onPress={() => {
              if (vodIndex >= 0) {
                router.push({ pathname: '/devotions/detail', params: { index: String(vodIndex) } });
              }
            }}
          >
            <View style={styles.votdAccent} />
            <View style={styles.votdBody}>
              <Text style={styles.votdLabel}>VERSE OF THE DAY</Text>
              <Text style={styles.votdSubtitle}>{vodSubtitle}</Text>
              <Text style={styles.votdVerse} numberOfLines={2}>
                {vodVerse || 'No verse available for this time of day.'}
              </Text>
              <Text style={styles.votdRef}>{vodReference || vodTitle || 'Devotional verse'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerDivider} />

          {/* ── UPPER SECTION — Menu Grid ── */}
          <View style={styles.menuSection}>
            <SectionHeader title="MAIN MENU" />
            {MENU_ROWS.map((row, ri) => (
              <View key={ri} style={[styles.menuRow, { paddingHorizontal: hPad }]}>
                {row.map((item) => (
                  <MenuButton
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    color={item.color}
                    size={menuBtnSize}
                    onPress={() => handleMenuPress(item)}
                  />
                ))}
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── LOWER SECTION ── */}

        {/* Featured Section */}
        {featuredItems.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="FEATURED"
              subtitle={`${featuredItems.length} highlighted resources`}
              icon={Sparkles}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredItems.map((item) => (
                <FeaturedCard key={item.id} item={item} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Resources Grid */}
        <View style={[styles.section, { paddingBottom: Spacing.md }]}>
          <SectionHeader
            title="ALL RESOURCES"
            subtitle={`${data.length} available`}
            icon={LayoutGrid}
          />
          <View style={[styles.grid, { paddingHorizontal: hPad, gap: cardGap }]}>
            {data.map((item) => (
              <ResourceCard key={item.id} item={item} cardWidth={cardWidth} />
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />
      <AdBanner placement="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},
  header: {
    paddingBottom: Spacing.lg,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold.subtle,
    borderWidth: 1,
    borderColor: Colors.gold.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.extrabold,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  appDate: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 1,
  },
  votdStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold.muted + '55',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  votdAccent: {
    width: 4,
    backgroundColor: Colors.gold.primary,
  },
  votdBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 3,
  },
  votdLabel: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: Colors.gold.light,
    letterSpacing: 1.5,
  },
  votdSubtitle: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: Typography.weight.semibold,
  },
  votdVerse: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  votdRef: {
    fontSize: Typography.size.xs,
    color: Colors.gold.primary,
    fontWeight: Typography.weight.semibold,
  },
  headerDivider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginBottom: Spacing.lg,
  },
  menuSection: {
    gap: Spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
  },
  section: {
    paddingTop: Spacing.xl,
  },
  featuredScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
