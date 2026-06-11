import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import {
  OpenSans_400Regular,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import {
  Merriweather_400Regular,
  Merriweather_700Bold,
} from '@expo-google-fonts/merriweather';
import {
  NotoSerif_400Regular,
  NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_700Bold,
} from '@expo-google-fonts/libre-baskerville';
import {
  NotoSerifEthiopic_400Regular,
  NotoSerifEthiopic_700Bold,
} from '@expo-google-fonts/noto-serif-ethiopic';

import { AppProvider, useAppSettings } from '@/contexts/AppContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import devotionalData from '@/data/devotional.json';
import { supabase } from '@/lib/supabase';
import {
  getVerseOfDayEntry,
  getVersePreview,
  getVerseReference,
  getVodNotificationKey,
  getVodSlot,
  type DevotionalEntry,
} from '@/lib/devotions';

SplashScreen.preventAutoHideAsync();

const runtimeNotificationMarkers = new Set<string>();

function hasNotificationMarker(key: string) {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem(key) === 'true';
    } catch {
      return runtimeNotificationMarkers.has(key);
    }
  }
  return runtimeNotificationMarkers.has(key);
}

function setNotificationMarker(key: string) {
  runtimeNotificationMarkers.add(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, 'true');
    } catch {
      // ignore storage failures and keep runtime marker
    }
  }
}

function AppShell() {
  useFrameworkReady();

  const { theme, colors, pushNotifications, verseOfDayNotifications } = useAppSettings();

  const [fontsLoaded, fontError] = useFonts({
    OpenSans_400Regular,
    OpenSans_700Bold,
    Lato_400Regular,
    Lato_700Bold,
    Merriweather_400Regular,
    Merriweather_700Bold,
    NotoSerif_400Regular,
    NotoSerif_700Bold,
    LibreBaskerville_400Regular,
    LibreBaskerville_700Bold,
    NotoSerifEthiopic_400Regular,
    NotoSerifEthiopic_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!pushNotifications || !verseOfDayNotifications) return;

    const devotionalEntries = devotionalData as DevotionalEntry[];

    const syncVerseOfDayNotification = async () => {
      const now = new Date();
      const marker = getVodNotificationKey(now);
      if (hasNotificationMarker(marker)) return;

      const entry = getVerseOfDayEntry(devotionalEntries, now);
      if (!entry) return;

      const slotLabel = getVodSlot(now) === 'evening' ? 'Evening' : 'Morning';
      const verseText = getVersePreview(entry).slice(0, 180);
      const verseRef = getVerseReference(entry);
      const title = `${slotLabel} Verse of the Day`;
      const body = verseRef ? `${verseText} — ${verseRef}` : verseText;
      const slotStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        getVodSlot(now) === 'evening' ? 18 : 0,
        0,
        0,
        0,
      ).toISOString();

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('title', title)
        .eq('body', body)
        .gte('created_at', slotStart)
        .limit(1);

      if (existing && existing.length > 0) {
        setNotificationMarker(marker);
        return;
      }

      const { error } = await supabase.from('notifications').insert({
        title,
        body,
        type: 'DEVOTION',
      });

      if (!error) {
        setNotificationMarker(marker);
      }
    };

    syncVerseOfDayNotification();
    const interval = setInterval(syncVerseOfDayNotification, 60000);
    return () => clearInterval(interval);
  }, [pushNotifications, verseOfDayNotifications]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.bg.primary}
      />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <SubscriptionProvider>
      <AppShell />
      </SubscriptionProvider>
    </AppProvider>
  );
}

