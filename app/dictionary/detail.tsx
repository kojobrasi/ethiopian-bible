import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { TouchableOpacity } from 'react-native';
import ScriptureLinkedHtml from '@/components/ScriptureLinkedHtml';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

type DictEntry = {
  topic?: string;
  lexeme?: string;
  definition?: string;
  short_definition?: string;
};

function formatDictionaryName(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function DictionaryDetailScreen() {
  const { dict, index } = useLocalSearchParams<{ dict?: string; index?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<DictEntry | null>(null);

  const dictSlug = useMemo(() => (typeof dict === 'string' ? dict : 'easton'), [dict]);
  const entryIndex = useMemo(() => {
    const parsed = Number(index);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [index]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(`/data/dictionary/${dictSlug}.json`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setEntry(list[entryIndex] || null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setEntry(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dictSlug, entryIndex]);

  const html = useMemo(() => {
    if (!entry) return '';
    const raw = (entry.definition || entry.short_definition || '').toString();
    return raw || '<p>No definition available.</p>';
  }, [entry]);

  const title = entry?.topic || entry?.lexeme || 'Dictionary Entry';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}> 
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{formatDictionaryName(dictSlug)}</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#2A7B7A" size="large" />
          <Text style={styles.loaderText}>Loading entry...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ScriptureLinkedHtml
            html={html}
            contentWidth={width - Spacing.lg * 2}
            renderHtmlProps={{
              tagsStyles: {
                body: { color: Colors.text.secondary, fontSize: Typography.size.md, lineHeight: 24 },
                p: { marginTop: 0, marginBottom: 12, color: Colors.text.secondary },
                b: { color: Colors.text.primary, fontWeight: '700' },
                strong: { color: Colors.text.primary, fontWeight: '700' },
                a: { color: '#2A7B7A', textDecorationLine: 'none' },
              },
              defaultTextProps: { selectable: true },
            }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { marginTop: Spacing.xs, marginLeft: 44, fontSize: Typography.size.sm, color: Colors.text.muted },
  content: {
    padding: Spacing.lg,
    margin: Spacing.lg,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loaderText: { fontSize: Typography.size.sm, color: Colors.text.muted },
});
