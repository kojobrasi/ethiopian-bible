import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
  Home, Search, Heart, Bell, Settings,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

type Tab = {
  label: string;
  route: '/(tabs)' | '/(tabs)/search' | '/(tabs)/devotions' | '/(tabs)/notifications' | '/(tabs)/settings';
  icon: typeof Home;
  match: string;
};

const TABS: Tab[] = [
  { label: 'HOME', route: '/(tabs)', icon: Home, match: '/index' },
  { label: 'SEARCH', route: '/(tabs)/search', icon: Search, match: '/search' },
  { label: 'DEVOTIONS', route: '/(tabs)/devotions', icon: Heart, match: '/devotions' },
  { label: 'ALERTS', route: '/(tabs)/notifications', icon: Bell, match: '/notifications' },
  { label: 'SETTINGS', route: '/(tabs)/settings', icon: Settings, match: '/settings' },
];

type Props = {
  notificationCount?: number;
};

export default function BottomTabBar({ notificationCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (tab: Tab) => {
    if (tab.match === '/index') return pathname === '/' || pathname === '/index';
    return pathname.includes(tab.match);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || Spacing.md }]}>
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Icon
                size={22}
                color={active ? Colors.tab.active : Colors.tab.inactive}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {tab.match === '/notifications' && notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.tab.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.tab.border,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    position: 'relative',
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.status.error,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
    color: '#fff',
  },
  label: {
    fontSize: 9,
    fontWeight: Typography.weight.semibold,
    color: Colors.tab.inactive,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: Colors.tab.active,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.tab.active,
  },
});
