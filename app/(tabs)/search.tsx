import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Clock, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import data from '@/data/data.json';
import { supabase, type SearchHistoryItem } from '@/lib/supabase';
import ResourceCard from '@/components/ResourceCard';
import BottomTabBar from '@/components/BottomTabBar';
import AdBanner from '@/components/AdBanner';
import SectionHeader from '@/components/SectionHeader';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

type Resource = typeof data[0];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Resource[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: hist } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (hist) setHistory(hist);
    })();
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearched(true);

    const q_lower = trimmed.toLowerCase();
    const found = data.filter(
      (item) =>
        item.name.toLowerCase().includes(q_lower) ||
        item.description.toLowerCase().includes(q_lower) ||
        item.type.toLowerCase().includes(q_lower),
    );
    setResults(found);

    setSaving(true);
    await supabase.from('search_history').insert({ query: trimmed, result_count: found.length });
    const { data: hist } = await supabase
      .from('search_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);
    if (hist) setHistory(hist);
    setSaving(false);
  }, []);

  const clearHistory = async () => {
    await supabase.from('search_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setHistory([]);
  };

  const cardWidth = 160;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={Colors.text.muted} />
            <TextInput
              style={styles.input}
              placeholder="Search resources, topics..."
              placeholderTextColor={Colors.text.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch(query)}
              returnKeyType="search"
              autoFocus={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); }}>
                <X size={16} color={Colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(query)}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        {searched ? (
          <View style={styles.section}>
            <SectionHeader
              title={`RESULTS FOR "${query}"`}
              subtitle={`${results.length} found`}
              icon={Search}
            />
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Search size={40} color={Colors.text.muted} strokeWidth={1} />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try a different search term</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {results.map((item) => (
                  <ResourceCard key={item.id} item={item} cardWidth={cardWidth} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {history.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="RECENT SEARCHES"
                  icon={Clock}
                  rightElement={
                    <TouchableOpacity onPress={clearHistory}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  }
                />
                <View style={styles.histList}>
                  {history.map((h) => (
                    <TouchableOpacity key={h.id} style={styles.histItem} onPress={() => handleSearch(h.query)}>
                      <Clock size={14} color={Colors.text.muted} />
                      <Text style={styles.histQuery} numberOfLines={1}>{h.query}</Text>
                      <Text style={styles.histCount}>{h.result_count} results</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader title="POPULAR TOPICS" icon={TrendingUp} />
              <View style={styles.tagGrid}>
                {['Bible Study', 'Devotions', 'Commentary', 'Greek', 'Hebrew', 'Maps', 'Video', 'Audio', 'Prayer', 'Prophecy'].map((tag) => (
                  <TouchableOpacity key={tag} style={styles.tag} onPress={() => handleSearch(tag)}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <BottomTabBar />
      <AdBanner placement="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary, marginBottom: Spacing.md },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border.default, paddingHorizontal: Spacing.md, height: 46 },
  input: { flex: 1, fontSize: Typography.size.base, color: Colors.text.primary },
  searchBtn: { paddingHorizontal: Spacing.xl, backgroundColor: Colors.gold.primary, borderRadius: Radius.lg, height: 46, justifyContent: 'center' },
  searchBtnText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text.inverse },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.md },
  emptyTitle: { fontSize: Typography.size.lg, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  emptySubtitle: { fontSize: Typography.size.sm, color: Colors.text.muted },
  histList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.subtle },
  histQuery: { flex: 1, fontSize: Typography.size.base, color: Colors.text.primary },
  histCount: { fontSize: Typography.size.xs, color: Colors.text.muted },
  clearText: { fontSize: Typography.size.sm, color: Colors.status.error },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.bg.card, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default },
  tagText: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
});
