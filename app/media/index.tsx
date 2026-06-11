import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const CHANNELS = [
  { id: 'bp', name: 'Bible Project', url: 'https://bibleproject.com/explore/' },
  { id: 'sermons', name: 'Sermons', url: 'https://www.sermonaudio.com' },
  { id: 'dg', name: 'Desiring God', url: 'https://www.desiringgod.org/messages' },
  { id: 'ligonier', name: 'Ligonier', url: 'https://www.ligonier.org/learn/series' },
  { id: 'tgc', name: 'TGC Media', url: 'https://www.thegospelcoalition.org/media/' },
];

export default function MediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(CHANNELS[0]);
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Play size={16} color="#8E44AD" />
          <Text style={styles.title}>Media</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {CHANNELS.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.tab, selected.id === c.id && styles.tabActive]} onPress={() => setSelected(c)}>
              <Text style={[styles.tabText, selected.id === c.id && styles.tabTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.divider} />
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {loading && <View style={styles.loader}><ActivityIndicator color="#8E44AD" size="large" /><Text style={styles.loaderText}>Loading media...</Text></View>}
        <WebView source={{ uri: selected.url }} style={styles.webview} onLoadEnd={() => setLoading(false)} onLoadStart={() => setLoading(true)} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  tabs: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  tabActive: { backgroundColor: '#8E44AD' + '28', borderColor: '#8E44AD' },
  tabText: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },
  tabTextActive: { color: '#BB8FE0' },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  webview: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loaderText: { fontSize: Typography.size.sm, color: Colors.text.muted },
});
