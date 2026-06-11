import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Globe, Star, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import data from '@/data/data.json';
import ResourceCard from '@/components/ResourceCard';
import SectionHeader from '@/components/SectionHeader';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const ALL_TYPES = ['ALL', ...Array.from(new Set(data.map((d) => d.type)))];

export default function ResourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = React.useState('ALL');

  const gap = Spacing.md;
  const hPad = Spacing.lg;
  const numCols = width < 600 ? 2 : width < 900 ? 3 : 4;
  const cardWidth = (width - hPad * 2 - gap * (numCols - 1)) / numCols;

  const filtered = useMemo(() =>
    filter === 'ALL' ? data : data.filter((d) => d.type === filter),
    [filter],
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Globe size={16} color="#27AE60" />
          <Text style={styles.title}>Resources</Text>
          <Text style={styles.count}>{filtered.length} items</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {ALL_TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.filterChip, filter === t && styles.filterChipActive]} onPress={() => setFilter(t)}>
              <Text style={[styles.filterText, filter === t && styles.filterTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.divider} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.grid, { paddingHorizontal: hPad, gap, paddingBottom: Spacing.xl }]} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => <ResourceCard key={item.id} item={item} cardWidth={cardWidth} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  count: { fontSize: Typography.size.sm, color: Colors.text.muted },
  filterRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  filterChipActive: { backgroundColor: '#27AE60' + '28', borderColor: '#27AE60' },
  filterText: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },
  filterTextActive: { color: '#2ECC71' },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.lg },
});
