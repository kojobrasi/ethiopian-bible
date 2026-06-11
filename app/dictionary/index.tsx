import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, FlatList, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const QUICK_TERMS = ['Grace', 'Faith', 'Covenant', 'Atonement', 'Redemption', 'Trinity', 'Prophecy', 'Messiah'];

const DICTIONARIES = [
  'easton',
  'brown',
  'hitchcock',
  'isbe',
  'nave',
  'smith',
  'vine-ot',
  'vine-nt',
  'webster',
];

const PAGE_SIZE = 30;

type DictEntry = {
  topic?: string;
  lexeme?: string;
  definition?: string;
  short_definition?: string;
  _idx: number;
};

function formatDictionaryName(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

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

export default function DictionaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedDict, setSelectedDict] = useState('easton'); // default to Easton
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // A-Z / Strong mode
  const [activeLetter, setActiveLetter] = useState('A');
  const [page, setPage] = useState(1);
  const [isStrongMode, setIsStrongMode] = useState(false);
  const [strongTab, setStrongTab] = useState<'G'|'H'>('G');

  useEffect(() => {
    // load selected dictionary
    let mounted = true;
    setLoading(true);
    setEntries([]);
    setPage(1);
    setActiveLetter('A');
    fetch(`/data/dictionary/${selectedDict}.json`).then((res) => res.json()).then((data) => {
      if (!mounted) return;
      const list = (Array.isArray(data) ? data : []).map((entry: any, idx: number) => ({
        ...entry,
        _idx: idx,
      }));
      setEntries(list);

      // detect strong dictionary by scanning topic/definition/lexeme for Strong's codes
      const strongRegex = /\b[HG]\d{1,5}\b|href=['"]S:[HG]\d{1,5}/i;
      const strongCount = list.filter((e: DictEntry) => {
        if (typeof e.topic === 'string' && /^[GH]\d+/i.test(e.topic)) return true;
        const text = ((e.definition || '') + ' ' + (e.lexeme || '') + ' ' + (e.short_definition || '')).toString();
        return strongRegex.test(text);
      }).length;
      // consider it a Strong-based dictionary if we found a reasonable number of matches
      setIsStrongMode(list.length > 0 && (strongCount >= 10 || strongCount / list.length > 0.05));
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setEntries([]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [selectedDict]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      // search within loaded entries and jump to result by setting activeLetter
      const q = query.trim().toLowerCase();
      const idx = entries.findIndex((e) => ((e.topic||e.lexeme||'') + '').toLowerCase().startsWith(q));
      if (idx >= 0) {
        const first = ((entries[idx].topic||entries[idx].lexeme||'') + '').charAt(0).toUpperCase();
        setActiveLetter(first);
        setPage(1);
      }
    }
  }, [query, entries]);

  const alphabet = useMemo(() => Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), []);

  const extractStrongCodes = useCallback((e: DictEntry) => {
    const text = ((e.definition || '') + ' ' + (e.topic || '') + ' ' + (e.lexeme || '')).toString();
    const codes = new Set<string>();
    const hrefRe = /href=['"]S:([HG]\d{1,5})['"]/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(text)) !== null) codes.add(m[1].toUpperCase());
    const simpleRe = /\b([HG]\d{1,5})\b/gi;
    while ((m = simpleRe.exec(text)) !== null) codes.add(m[1].toUpperCase());
    return Array.from(codes);
  }, []);

  const filtered = useMemo(() => {
    if (isStrongMode) {
      // strong mode: use found Strong codes in topic/definition to decide H/G membership
      return entries.filter((e) => {
        // if topic contains the code directly, prefer that
        if (typeof e.topic === 'string' && /^[GH]\d+/i.test(e.topic)) return e.topic.toUpperCase().startsWith(strongTab);
        const codes = extractStrongCodes(e);
        if (!codes || codes.length === 0) return false;
        return codes.some((c) => c.startsWith(strongTab));
      });
    }
    const letter = activeLetter.toUpperCase();
    return entries.filter((e) => {
      const label = (e.topic || e.lexeme || '').toString();
      return label.charAt(0).toUpperCase() === letter;
    });
  }, [entries, activeLetter, isStrongMode, strongTab, extractStrongCodes]);

  const pageSize = PAGE_SIZE * page;
  const pageItems = filtered.slice(0, pageSize);

  function loadMore() {
    if (pageItems.length < filtered.length) setPage((p) => p + 1);
  }

  function renderItem({ item }: { item: DictEntry }) {
    const label = item.topic || item.lexeme || '';
    const source = formatDictionaryName(selectedDict);
    const defText = stripHtml((item.definition || item.short_definition || '').toString());
    const preview = defText.slice(0, 45) + (defText.length > 45 ? '...' : '');
    return (
      <TouchableOpacity
        style={styles.entry}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: '/dictionary/detail',
            params: {
              dict: selectedDict,
              index: String(item._idx),
            },
          })
        }
      >
        <Text style={styles.entryTitle}>{label}</Text>
        <Text style={styles.entryDef} numberOfLines={2}>{preview}</Text>
        <Text style={styles.entrySource}>{source}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}> 
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Dictionary</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.selectorIcon}>📚</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={Colors.text.muted} />
            <TextInput style={styles.input} placeholder="Look up a term..." placeholderTextColor={Colors.text.muted} value={query} onChangeText={setQuery} onSubmitEditing={handleSearch} returnKeyType="search" />
            {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={14} color={Colors.text.muted} /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {/* Subnavbar: A-Z or Strong tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {isStrongMode ? (
            <>
              <TouchableOpacity style={[styles.chip, strongTab === 'H' && styles.chipActive]} onPress={() => { setStrongTab('H'); setPage(1); }}>
                <Text style={[styles.chipText, strongTab === 'H' && styles.chipTextActive]}>HEBREW</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, strongTab === 'G' && styles.chipActive]} onPress={() => { setStrongTab('G'); setPage(1); }}>
                <Text style={[styles.chipText, strongTab === 'G' && styles.chipTextActive]}>GREEK</Text>
              </TouchableOpacity>
            </>
          ) : (
            alphabet.map((L) => (
              <TouchableOpacity key={L} style={[styles.chip, activeLetter === L && styles.chipActive]} onPress={() => { setActiveLetter(L); setPage(1); }}>
                <Text style={[styles.chipText, activeLetter === L && styles.chipTextActive]}>{L}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.divider} />
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {loading && <View style={styles.loader}><ActivityIndicator color="#2A7B7A" size="large" /><Text style={styles.loaderText}>Loading dictionary...</Text></View>}

        {!loading && (
          <FlatList
            data={pageItems}
            keyExtractor={(i, idx) => (i.topic || i.lexeme || idx.toString())}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ padding: Spacing.lg }}
            ListEmptyComponent={<View style={{ padding: Spacing.lg }}><Text style={{ color: Colors.text.muted }}>No entries for this selection.</Text></View>}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.container, { paddingTop: insets.top }]}> 
          <View style={[styles.headerRow, { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }]}> 
            <TouchableOpacity style={styles.backBtn} onPress={() => setModalVisible(false)}>
              <ChevronLeft size={22} color={Colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Dictionary</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {DICTIONARIES.map((d) => (
              <TouchableOpacity key={d} style={[styles.dictRow, d === selectedDict && styles.dictRowActive]} onPress={() => { setSelectedDict(d); setModalVisible(false); }}>
                <Text style={[styles.dictName, d === selectedDict && styles.dictNameActive]}>{formatDictionaryName(d)}</Text>
                {d === selectedDict && <Text style={{ color: '#4ABAB9' }}>selected</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bg.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default, paddingHorizontal: Spacing.md, height: 42 },
  input: { flex: 1, fontSize: Typography.size.md, color: Colors.text.primary },
  searchBtn: { paddingHorizontal: Spacing.md, backgroundColor: '#2A7B7A', borderRadius: Radius.md, height: 42, justifyContent: 'center' },
  searchBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: '#fff' },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  chipActive: { backgroundColor: '#2A7B7A' + '30', borderColor: '#2A7B7A' },
  chipText: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  chipTextActive: { color: '#4ABAB9', fontWeight: Typography.weight.semibold },
  divider: { height: 1, backgroundColor: Colors.border.subtle, marginTop: Spacing.sm },
  loader: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loaderText: { fontSize: Typography.size.sm, color: Colors.text.muted },
  selectorBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  selectorIcon: { fontSize: 18 },
  dictRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  dictRowActive: { backgroundColor: Colors.bg.card },
  dictName: { fontSize: Typography.size.md, color: Colors.text.primary },
  dictNameActive: { color: '#2A7B7A', fontWeight: Typography.weight.semibold },
  entry: { marginBottom: Spacing.md, backgroundColor: Colors.bg.card, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default },
  entryTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  entryDef: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  entrySource: { marginTop: Spacing.xs, fontSize: Typography.size.xs, color: Colors.text.muted },
});
