import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RenderHtml from 'react-native-render-html';
import ScriptureLinkedHtml from '@/components/ScriptureLinkedHtml';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import devotionalData from '@/data/devotional.json';

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

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeHtml(raw: string) {
  return (raw || '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

export default function DevotionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { index } = useLocalSearchParams<{ index?: string }>();

  const parsedIndex = Number(index);
  const entries = devotionalData as DevotionalEntry[];
  const entry = Number.isFinite(parsedIndex) ? entries[parsedIndex] : undefined;

  const html = useMemo(() => {
    if (!entry) {
      return '<p>No devotion content found.</p>';
    }

    const normalizedTitle = normalizeHtml(entry.title || 'Untitled');
    const normalizedVerse = normalizeHtml(entry.verse || '');
    const normalizedDevotion = normalizeHtml(entry.devotion || '');
    const titleHasHeadingTag = /<h[1-6][^>]*>/i.test(normalizedTitle);
    const devotionHasHeadingTag = /<h[1-6][^>]*>/i.test(normalizedDevotion);

    const titleBlock = titleHasHeadingTag
      ? normalizedTitle
      : `<h2>${escapeHtml(normalizedTitle)}</h2>`;

    // If devotion already starts with heading markup, avoid duplicating heading in detail.
    const finalTitleBlock = devotionHasHeadingTag ? '' : titleBlock;

    return `
      <div>
        ${finalTitleBlock}
        <p><strong>${escapeHtml((entry.month || '') + ' ' + String(entry.day || ''))}</strong></p>
        ${normalizedVerse ? `<blockquote>${normalizedVerse}</blockquote>` : ''}
        ${normalizedDevotion}
        ${entry.author ? `<p><strong>Author:</strong> ${escapeHtml(entry.author)}</p>` : ''}
        ${entry.source ? `<p><strong>Source:</strong> ${escapeHtml(entry.source)}</p>` : ''}
      </div>
    `;
  }, [entry]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}> 
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.title}>Devotion Detail</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.contentWrap}>
        <View style={styles.contentCard}>
          <ScriptureLinkedHtml
            html={html}
            contentWidth={width - Spacing.lg * 2 - Spacing.md * 2}
            renderHtmlProps={{
              tagsStyles: {
                body: { color: Colors.text.secondary, fontSize: Typography.size.md, lineHeight: 24 },
                h2: { color: Colors.text.primary, marginTop: 0, marginBottom: 8 },
                h3: { color: Colors.text.primary, marginTop: 0, marginBottom: 8, fontWeight: '700', fontSize: Typography.size.lg },
                p: { marginTop: 0, marginBottom: 12, color: Colors.text.secondary },
                b: { color: Colors.text.primary, fontWeight: '700' },
                strong: { color: Colors.text.primary, fontWeight: '700' },
                blockquote: {
                  borderLeftWidth: 3,
                  borderLeftColor: '#C0392B',
                  paddingLeft: 10,
                  marginLeft: 0,
                  color: Colors.text.secondary,
                },
              },
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  contentWrap: { padding: Spacing.lg },
  contentCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
});
