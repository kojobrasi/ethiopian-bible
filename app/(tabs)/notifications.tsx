import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomTabBar from '@/components/BottomTabBar';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import devotionalData from '@/data/devotional.json';
import { supabase, type Notification } from '@/lib/supabase';
import { stripHtml } from '@/lib/devotions';

const TYPE_CONFIG = {
  INFO: { icon: 'information-circle', color: Colors.types.WEBSITE },
  DEVOTION: { icon: 'book', color: Colors.types.DEVOTION },
  QUIZ: { icon: 'help-circle', color: Colors.types.QUIZ },
} as const;

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    Alert.alert('Delete notification?', 'This will remove it from the feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('notifications').delete().eq('id', id);
          setNotifications((current) => current.filter((item) => item.id !== id));
        },
      },
    ]);
  }, []);

  const resolveDevotionIndex = useCallback((notification: Notification) => {
    const explicitMatch = notification.body.match(/devotion index:(\d+)/i) || notification.title.match(/devotion index:(\d+)/i);
    if (explicitMatch) {
      return Number(explicitMatch[1]);
    }

    const searchText = `${notification.title} ${notification.body}`.toLowerCase();
    const matchedIndex = devotionalData.findIndex((entry) => {
      const title = stripHtml(String(entry.title ?? '')).toLowerCase();
      const devotion = stripHtml(String(entry.devotion ?? '')).toLowerCase();
      const verse = stripHtml(String(entry.verse ?? '')).toLowerCase();
      return [title, devotion, verse].some((value) => value && searchText.includes(value));
    });

    return matchedIndex >= 0 ? matchedIndex : null;
  }, []);

  const openNotification = useCallback(
    (notification: Notification) => {
      void markRead(notification.id);
      const devotionIndex = resolveDevotionIndex(notification);
      if (devotionIndex !== null) {
        router.push({ pathname: '/devotions/detail', params: { index: String(devotionIndex) } });
      }
    },
    [markRead, resolveDevotionIndex, router],
  );

  return (
    <LinearGradient colors={[Colors.bg.primary, Colors.bg.secondary]} style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}> 
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>NOTIFICATIONS</Text>
            <Text style={styles.title}>Recent activity</Text>
          </View>
          <TouchableOpacity onPress={markAllRead} style={styles.markAllButton} activeOpacity={0.85}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unread</Text>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{notifications.length}</Text>
          </View>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} tintColor={Colors.gold.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={28} color={Colors.text.secondary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>Verse of the day alerts and other activity will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.INFO;
            const Icon = config.icon;
            const devotionIndex = resolveDevotionIndex(item);

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => openNotification(item)}
                style={[styles.card, !item.read && styles.cardUnread]}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${config.color}20` }]}>
                  <Ionicons name={Icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={config.color} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        void deleteNotif(item.id);
                      }}
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardBodyText} numberOfLines={3}>
                    {item.body}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
                    {devotionIndex !== null && <Text style={styles.cardMeta}>Opens devotion</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <BottomTabBar activeRoute="notifications" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  kicker: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.gold.light,
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 4,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  markAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.elevated,
  },
  markAllText: {
    color: Colors.text.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  listContent: { paddingBottom: 120, gap: Spacing.sm },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardUnread: {
    borderColor: Colors.gold.light,
    shadowColor: Colors.gold.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  cardTitleUnread: { color: Colors.gold.primary },
  cardBodyText: {
    marginTop: 6,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  cardMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  cardMeta: {
    fontSize: Typography.size.xs,
    color: Colors.gold.primary,
    fontWeight: Typography.weight.semibold,
  },
});