import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Share,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, ChevronRight, BookOpen, List,
  Search, Share2, Type, ChevronDown, X,
  MessageSquare, Link2, Bookmark, PenLine, Shield, Palette,
} from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import ScriptureLinkedHtml from '@/components/ScriptureLinkedHtml';

import { useBibleReader } from '@/hooks/useBibleReader';
import { groupIntoSections, type Catalog, type CatalogBook } from '@/lib/bible';
import bibleVersionsData from '@/data/bible.json';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAppSettings } from '@/contexts/AppContext';
import {
  setHighlight,
  setNote,
  loadAnnotationsForChapter,
  type HighlightEntry,
  type NoteEntry,
} from '@/lib/annotations';

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
const FONT_SIZES: Record<FontSize, number> = { sm: 14, md: 16, lg: 19, xl: 22 };
const FONT_SIZE_LABELS: FontSize[] = ['sm', 'md', 'lg', 'xl'];

// Accent color per section — matches ekjv section_key values
const SECTION_COLORS: Record<string, string> = {
  ot: '#C8A84B',
  nt: '#4B9BC8',
  dc: '#8B6CB5',
  ec: '#4BB57A',
};

const SECTION_LABELS: Record<string, string> = {
  ot: 'Old Test.',
  nt: 'New Test.',
  dc: 'Apocryphal',
  ec: 'Ethiopian',
};

// ─── Commentary Types & Constants ────────────────────────────────────────────

type CommentaryEntry = {
  source: string;
  sourceName: string;
  vf: number;
  vt: number;
  x: string;
  t: string;
};

const COMMENTARY_SOURCES = [
  { key: 'barnes',   name: "Barnes' Notes" },
  { key: 'clarke',   name: "Clarke's Commentary" },
  { key: 'mhc',      name: 'Matthew Henry Complete' },
  { key: 'mhwc',     name: 'Matthew Henry Concise' },
  { key: 'scofield', name: 'Scofield Reference' },
  { key: 'tsk',      name: 'Treasury of Scripture' },
];

const SOURCE_COLORS: Record<string, string> = {
  barnes:   '#3A7BD5',
  clarke:   '#C0392B',
  mhc:      '#27AE60',
  mhwc:     '#8E44AD',
  scofield: '#C8A84B',
  tsk:      '#E67E22',
};

function stripTagsForPreview(html: string) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Book Picker Modal ───────────────────────────────────────────────────────

function BookPicker({
  visible,
  catalog,
  currentBook,
  onSelect,
  onClose,
}: {
  visible: boolean;
  catalog: ReturnType<typeof useBibleReader>['catalog'];
  currentBook: CatalogBook | null;
  onSelect: (b: CatalogBook) => void;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  const [filter, setFilter] = useState('');
  const [section, setSection] = useState<string>('ot');

  const sections = useMemo(
    () => (catalog ? groupIntoSections(catalog.books) : []),
    [catalog],
  );

  const displayedBooks = useMemo(() => {
    const sec = sections.find((s) => s.key === section);
    if (!sec) return [];
    const q = filter.toLowerCase();
    return q
      ? sec.books.filter(
          (b) => b.name.toLowerCase().includes(q) || b.short_name.toLowerCase().includes(q),
        )
      : sec.books;
  }, [sections, section, filter]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[picker.root, { backgroundColor: colors.bg.primary }]}>

        {/* Header */}
        <View style={[picker.header, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[picker.title, { color: colors.text.primary }]}>Select Book</Text>
          <TouchableOpacity onPress={onClose} style={picker.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[picker.searchRow, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <Search size={16} color={colors.text.muted} />
          <TextInput
            style={[picker.input, { color: colors.text.primary }]}
            placeholder="Search book..."
            placeholderTextColor={colors.text.muted}
            value={filter}
            onChangeText={setFilter}
          />
        </View>

        {/* Swipeable section tabs — fixed height, does NOT grow */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={picker.tabsContent}
          style={picker.tabsRow}
          bounces={false}
        >
          {sections.map((s) => {
            const active = section === s.key;
            const color = SECTION_COLORS[s.key] ?? colors.gold.primary;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  picker.sectionTab,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                  active && { backgroundColor: color + '22', borderColor: color },
                ]}
                onPress={() => { setSection(s.key); setFilter(''); }}
              >
                <View style={[picker.tabDot, { backgroundColor: active ? color : colors.border.default }]} />
                <Text style={[picker.sectionTabText, { color: colors.text.secondary }, active && { color }]}>
                  {SECTION_LABELS[s.key] ?? s.label}
                </Text>
                <Text style={[picker.tabCount, { color: colors.text.muted }, active && { color: color + 'BB' }]}>
                  {s.books.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Book grid — flex: 1 so it fills remaining space without overlap */}
        <View style={picker.listContainer}>
          <FlatList
            data={displayedBooks}
            keyExtractor={(item) => String(item.book_number)}
            numColumns={3}
            contentContainerStyle={picker.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item.book_number === currentBook?.book_number;
              const color = SECTION_COLORS[item.section_key] ?? colors.gold.primary;
              return (
                <TouchableOpacity
                  style={[
                    picker.bookItem,
                    { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                    active && { backgroundColor: color + '22', borderColor: color },
                  ]}
                  onPress={() => { onSelect(item); onClose(); setFilter(''); }}
                  activeOpacity={0.75}
                >
                  <Text style={[picker.bookShort, { color: active ? color : color + 'AA' }]} numberOfLines={1}>
                    {item.short_name}
                  </Text>
                    <Text style={[picker.bookName, { color: colors.text.secondary }, active && { color: colors.text.primary }]} numberOfLines={2}>
                    {item.name ? item.name.trim() : ''}
                  </Text>
                  <Text style={[picker.bookChapters, { color: colors.text.muted }]}>{item.chapter_count} ch</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={picker.empty}>
                <Text style={picker.emptyText}>No books found</Text>
              </View>
            }
          />
        </View>

      </View>
    </Modal>
  );
}

// ─── Commentary Detail Sheet ────────────────────────────────────────────────

function CommentaryDetailSheet({
  visible,
  entry,
  bookName,
  chapter,
  verse,
  onClose,
}: {
  visible: boolean;
  entry: CommentaryEntry | null;
  bookName: string;
  chapter: number;
  verse: number;
  onClose: () => void;
}) {
  const { colors, fontOption } = useAppSettings();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!entry) return null;

  const sourceColor = SOURCE_COLORS[entry.source] ?? Colors.gold.primary;

  const tagsStyles = {
    p:    { color: colors.text.primary, fontSize: 15, lineHeight: 24, marginBottom: 10 },
    b:    { color: colors.text.primary, fontWeight: '700' as const },
    i:    { color: colors.text.secondary },
    span: { color: colors.text.primary },
    a:    { color: Colors.gold.primary },
    h2:   { color: colors.text.primary, fontSize: 17, fontWeight: '700' as const },
    h3:   { color: colors.text.primary, fontSize: 15, fontWeight: '600' as const },
    sup:  { fontSize: 10 },
  };

  const baseStyle = {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 24,
    ...(fontOption.regular ? { fontFamily: fontOption.regular } : {}),
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <View style={[cStyles.header, { borderBottomColor: colors.border.subtle, paddingTop: insets.top + Spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[cStyles.headerSub, { color: sourceColor }]}>{entry.sourceName.toUpperCase()}</Text>
            <Text style={[cStyles.headerTitle, { color: colors.text.primary }]}>
              {bookName} {chapter}:{verse}
            </Text>
          </View>
          <TouchableOpacity style={cStyles.closeBtn} onPress={onClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40 }}>
          <ScriptureLinkedHtml
            html={entry.t || entry.x || ''}
            contentWidth={width - Spacing.lg * 2}
            renderHtmlProps={{
              tagsStyles,
              baseStyle,
            }}
          />
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Commentary Sheet ─────────────────────────────────────────────────────────

function CommentarySheet({
  visible,
  bookNumber,
  bookName,
  chapter,
  verse,
  onClose,
}: {
  visible: boolean;
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailEntry, setDetailEntry] = useState<CommentaryEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!visible || !bookNumber || !chapter || !verse) return;
    let mounted = true;
    setLoading(true);
    setEntries([]);

    const fetches = COMMENTARY_SOURCES.map(async ({ key, name }) => {
      try {
        const res = await fetch(`/data/commentary/${key}/${bookNumber}/${chapter}.json`);
        if (!res.ok) return [] as CommentaryEntry[];
        const data = (await res.json()) as Array<{ vf: number; vt: number; x: string; t: string }>;
        return data
          .filter((e) => e.vf <= verse && e.vt >= verse)
          .map((e): CommentaryEntry => ({ ...e, source: key, sourceName: name }));
      } catch {
        return [] as CommentaryEntry[];
      }
    });

    void Promise.allSettled(fetches).then((results) => {
      if (!mounted) return;
      const all: CommentaryEntry[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value);
      }
      setEntries(all);
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [visible, bookNumber, chapter, verse]);

  const verseRef = `${bookName} ${chapter}:${verse}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <View style={[cStyles.header, { borderBottomColor: colors.border.subtle, paddingTop: insets.top + Spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[cStyles.headerSub, { color: Colors.gold.primary }]}>COMMENTARY</Text>
            <Text style={[cStyles.headerTitle, { color: colors.text.primary }]}>{verseRef}</Text>
          </View>
          <TouchableOpacity style={cStyles.closeBtn} onPress={onClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={cStyles.centeredState}>
            <ActivityIndicator color={Colors.gold.primary} size="large" />
            <Text style={[cStyles.stateText, { color: colors.text.muted }]}>Loading commentaries…</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={cStyles.centeredState}>
            <MessageSquare size={36} color={colors.text.muted} />
            <Text style={[cStyles.stateTitle, { color: colors.text.primary }]}>No commentary found</Text>
            <Text style={[cStyles.stateText, { color: colors.text.secondary }]}>
              No commentary available for {verseRef}.
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item, idx) => `${item.source}-${idx}`}
            contentContainerStyle={cStyles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
            renderItem={({ item }) => {
              const sc = SOURCE_COLORS[item.source] ?? Colors.gold.primary;
              const plainText = stripTagsForPreview(item.x);
              const preview = plainText.slice(0, 120);
              return (
                <TouchableOpacity
                  style={[cStyles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
                  activeOpacity={0.82}
                  onPress={() => { setDetailEntry(item); setShowDetail(true); }}
                >
                  <View style={cStyles.cardTop}>
                    <View style={[cStyles.sourceBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                      <Text style={[cStyles.sourceText, { color: sc }]}>{item.sourceName}</Text>
                    </View>
                    <Text style={[cStyles.verseRefText, { color: colors.text.muted }]}>{verseRef}</Text>
                  </View>
                  <Text style={[cStyles.preview, { color: colors.text.secondary }]} numberOfLines={3}>
                    {preview}{plainText.length > 120 ? '…' : ''}
                  </Text>
                  <Text style={[cStyles.readMore, { color: Colors.gold.primary }]}>Read full commentary →</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <CommentaryDetailSheet
        visible={showDetail}
        entry={detailEntry}
        bookName={bookName}
        chapter={chapter}
        verse={verse}
        onClose={() => setShowDetail(false)}
      />
    </Modal>
  );
}

// ─── Chapter Picker Modal ────────────────────────────────────────────────────

function ChapterPicker({
  visible,
  currentBook,
  currentChapter,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentBook: CatalogBook | null;
  currentChapter: number;
  onSelect: (n: number) => void;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  if (!currentBook) return null;
  const chapters = Array.from({ length: currentBook.chapter_count }, (_, i) => i + 1);
  const color = SECTION_COLORS[currentBook.section_key] ?? colors.gold.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[picker.root, { backgroundColor: colors.bg.primary }]}>
        <View style={[picker.header, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[picker.title, { color: colors.text.primary }]}>{(currentBook.name ? currentBook.name.trim() : '') + ' — Chapter'}</Text>
          <TouchableOpacity onPress={onClose} style={picker.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <View style={picker.listContainer}>
          <FlatList
            data={chapters}
            keyExtractor={String}
            numColumns={5}
            contentContainerStyle={picker.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item === currentChapter;
              return (
                <TouchableOpacity
                  style={[picker.chapterItem, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[picker.chapterNum, active && { color: Colors.bg.primary }]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Highlight Colors ─────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { name: 'Yellow',       hex: '#FFD700' },
  { name: 'Lime Green',   hex: '#7CFC00' },
  { name: 'Cyan',         hex: '#00E5FF' },
  { name: 'Magenta',      hex: '#FF44AA' },
  { name: 'Orange',       hex: '#FF8C00' },
  { name: 'Light Blue',   hex: '#87CEEB' },
  { name: 'Pink',         hex: '#FFB6C1' },
  { name: 'Lavender',     hex: '#B388FF' },
  { name: 'Coral',        hex: '#FF7F50' },
  { name: 'Mint',         hex: '#98FF98' },
];

// ─── Highlight Color Picker Modal ─────────────────────────────────────────────

function HighlightColorPicker({
  visible,
  currentHighlight,
  onSelectColor,
  onRemove,
  onClose,
}: {
  visible: boolean;
  currentHighlight: string | null;
  onSelectColor: (color: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={hModal.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[hModal.sheet, { backgroundColor: colors.bg.elevated, borderColor: colors.border.default }]}
          onPress={() => {}}
        >
          <View style={hModal.handle}>
            <View style={[hModal.handleBar, { backgroundColor: colors.text.muted }]} />
          </View>

          <View style={hModal.header}>
            <Palette size={18} color={colors.gold.primary} />
            <Text style={[hModal.title, { color: colors.text.primary }]}>Highlight Color</Text>
          </View>

          <View style={hModal.grid}>
            {HIGHLIGHT_COLORS.map((c) => {
              const isActive = currentHighlight === c.hex;
              return (
                <TouchableOpacity
                  key={c.hex}
                  style={[
                    hModal.colorBtn,
                    { backgroundColor: c.hex + '30', borderColor: c.hex },
                    isActive && { borderWidth: 3, borderColor: c.hex, backgroundColor: c.hex + '50' },
                  ]}
                  onPress={() => onSelectColor(c.hex)}
                >
                  <View style={[hModal.colorDot, { backgroundColor: c.hex }]} />
                  <Text style={[hModal.colorName, { color: colors.text.secondary }]}>{c.name}</Text>
                  {isActive && (
                    <View style={[hModal.checkBadge, { backgroundColor: c.hex }]}>
                      <Text style={hModal.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {currentHighlight && (
            <TouchableOpacity
              style={[hModal.removeBtn, { borderColor: colors.status.error + '44' }]}
              onPress={onRemove}
            >
              <Text style={[hModal.removeText, { color: colors.status.error }]}>Remove Highlight</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[hModal.doneBtn, { backgroundColor: colors.gold.primary }]}
            onPress={onClose}
          >
            <Text style={hModal.doneText}>Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const hModal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  handle: { alignItems: 'center', paddingVertical: Spacing.sm },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  colorBtn: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    position: 'relative',
  },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorName: { fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, flex: 1 },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 11, color: '#000', fontWeight: '800' },
  removeBtn: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  removeText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  doneBtn: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  doneText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
});

// ─── Notes Editor Modal ───────────────────────────────────────────────────────

function NotesEditorModal({
  visible,
  verseRef,
  currentNote,
  onSave,
  onClose,
}: {
  visible: boolean;
  verseRef: string;
  currentNote: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(currentNote);
  const [charCount, setCharCount] = useState(currentNote.length);

  useEffect(() => {
    if (visible) {
      setText(currentNote);
      setCharCount(currentNote.length);
    }
  }, [visible, currentNote]);

  const handleChange = useCallback((val: string) => {
    setText(val);
    setCharCount(val.length);
  }, []);

  const handleSave = useCallback(() => {
    onSave(text.trim() || '');
  }, [text, onSave]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[nStyles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[nStyles.header, { borderBottomColor: colors.border.subtle, paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity style={nStyles.cancelBtn} onPress={onClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={nStyles.headerCenter}>
            <Text style={[nStyles.headerTitle, { color: colors.text.primary }]}>Verse Note</Text>
            <Text style={[nStyles.headerRef, { color: colors.text.muted }]}>{verseRef}</Text>
          </View>
          <TouchableOpacity
            style={[nStyles.saveBtn, { backgroundColor: colors.gold.primary }]}
            onPress={handleSave}
          >
            <Text style={nStyles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={nStyles.editorScroll}
          contentContainerStyle={nStyles.editorContent}
          keyboardShouldPersistTaps="always"
        >
          <View style={[nStyles.textAreaWrapper, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <TextInput
              style={[nStyles.textArea, { color: colors.text.primary }]}
              placeholder="Write your thoughts, insights, or reflections on this verse..."
              placeholderTextColor={colors.text.muted}
              multiline
              value={text}
              onChangeText={handleChange}
              textAlignVertical="top"
              autoFocus
            />
          </View>

          <View style={nStyles.charRow}>
            <Text style={[nStyles.charCount, { color: colors.text.muted }]}>
              {charCount} character{charCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {currentNote ? (
            <View style={[nStyles.metaCard, { backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }]}>
              <Text style={[nStyles.metaLabel, { color: colors.text.muted }]}>Last saved</Text>
              <Text style={[nStyles.metaValue, { color: colors.text.secondary }]}>
                {new Date().toLocaleString()}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const nStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  cancelBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  headerRef: { fontSize: Typography.size.xs, marginTop: 1 },
  saveBtn: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  saveText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  editorScroll: { flex: 1 },
  editorContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  textAreaWrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 220,
    marginBottom: Spacing.md,
  },
  textArea: {
    fontSize: 16,
    lineHeight: 24,
    padding: Spacing.md,
    minHeight: 220,
  },
  charRow: { alignItems: 'flex-end', marginBottom: Spacing.lg },
  charCount: { fontSize: Typography.size.xs },
  metaCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  metaLabel: { fontSize: Typography.size.xs, marginBottom: 2 },
  metaValue: { fontSize: Typography.size.sm },
});

// ─── Cross-Reference Sheet ────────────────────────────────────────────────────

type CrossRefEntry = {
  bookNumber: number;
  chapter: number;
  verse: number;
  displayRef: string;
  label: string;
};

function parseCrossReferences(html: string): CrossRefEntry[] {
  const refs: CrossRefEntry[] = [];
  // Match all href='B:book chapter:verse' patterns
  const regex = /<a\s+href='B:(\d+)\s+(\d+):([\d-]+)'>([^<]+)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const bookNumber = parseInt(match[1], 10);
    const chapter = parseInt(match[2], 10);
    const verseRaw = match[3];
    const label = match[4].trim();

    // Handle verse ranges e.g. "22-30"
    const [vStart] = verseRaw.split('-');
    const verse = parseInt(vStart, 10);

    refs.push({
      bookNumber,
      chapter,
      verse,
      displayRef: `${chapter}:${verseRaw}`,
      label,
    });
  }
  return refs;
}

function CrossReferenceSheet({
  visible,
  bookNumber,
  bookName,
  chapter,
  verse,
  catalog,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  catalog: Catalog | null;
  onClose: () => void;
  onNavigate: (b: CatalogBook, ch: number) => void;
}) {
  const { colors, fontOption } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [crossRefs, setCrossRefs] = useState<CrossRefEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<{ key: string; label: string; refs: CrossRefEntry[] }[]>([]);

  // Build book number → name mapping from catalog
  const bookNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (catalog?.books) {
      for (const b of catalog.books) {
        map[b.book_number] = b.name?.trim() ?? `Book ${b.book_number}`;
      }
    }
    return map;
  }, [catalog]);

  useEffect(() => {
    if (!visible || !bookNumber || !chapter || !verse) return;
    let mounted = true;
    setLoading(true);
    setCrossRefs([]);

    (async () => {
      try {
        const res = await fetch(`/data/commentary/tsk/${bookNumber}/${chapter}.json`);
        if (!res.ok) {
          if (mounted) setLoading(false);
          return;
        }
        const data = (await res.json()) as Array<{ vf: number; vt: number; x: string; t: string }>;

        // Find entries matching this verse
        const all: CrossRefEntry[] = [];
        for (const entry of data) {
          if (entry.vf <= verse && entry.vt >= verse) {
            const parsed = parseCrossReferences(entry.t);
            // Deduplicate by book+chapter+verse
            const seen = new Set<string>();
            for (const ref of parsed) {
              const key = `${ref.bookNumber}:${ref.chapter}:${ref.verse}`;
              if (!seen.has(key)) {
                seen.add(key);
                all.push(ref);
              }
            }
          }
        }
        if (mounted) {
          setCrossRefs(all);

          // Group by section/type (bold headings in TSK)
          const groups: { key: string; label: string; refs: CrossRefEntry[] }[] = [];
          const uniqueLabels = [...new Set(all.map((r) => r.label))];
          for (const lbl of uniqueLabels) {
            const matches = all.filter((r) => r.label === lbl);
            if (matches.length > 0) {
              groups.push({ key: lbl, label: lbl, refs: matches });
            }
          }
          // If no groups by label, put all in "Cross References"
          if (groups.length === 0 && all.length > 0) {
            groups.push({ key: 'all', label: 'Cross References', refs: all });
          }
          setGrouped(groups);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [visible, bookNumber, chapter, verse]);

  const verseRef = `${bookName} ${chapter}:${verse}`;

  const handleNavigateToRef = useCallback((ref: CrossRefEntry) => {
    const book = catalog?.books?.find((b) => b.book_number === ref.bookNumber);
    if (book) {
      onNavigate(book, ref.chapter);
      onClose();
    }
  }, [catalog, onNavigate, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <View style={[xrStyles.header, { borderBottomColor: colors.border.subtle, paddingTop: insets.top + Spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[xrStyles.headerSub, { color: Colors.gold.primary }]}>CROSS REFERENCES</Text>
            <Text style={[xrStyles.headerTitle, { color: colors.text.primary }]}>{verseRef}</Text>
          </View>
          <TouchableOpacity style={xrStyles.closeBtn} onPress={onClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={xrStyles.centeredState}>
            <ActivityIndicator color={Colors.gold.primary} size="large" />
            <Text style={[xrStyles.stateText, { color: colors.text.muted }]}>Loading cross references…</Text>
          </View>
        ) : crossRefs.length === 0 ? (
          <View style={xrStyles.centeredState}>
            <Link2 size={36} color={colors.text.muted} />
            <Text style={[xrStyles.stateTitle, { color: colors.text.primary }]}>No cross references found</Text>
            <Text style={[xrStyles.stateText, { color: colors.text.secondary }]}>No Treasury of Scripture Knowledge references available for {verseRef}.</Text>
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.key}
            contentContainerStyle={xrStyles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View style={xrStyles.group}>
                <View style={[xrStyles.groupHeader, { backgroundColor: Colors.gold.primary + '15', borderColor: Colors.gold.primary + '30' }]}>
                  <Text style={[xrStyles.groupLabel, { color: Colors.gold.primary }]}>{group.label}</Text>
                  <Text style={[xrStyles.groupCount, { color: Colors.gold.primary + 'AA' }]}>{group.refs.length}</Text>
                </View>
                {group.refs.map((ref, idx) => {
                  const refBookName = bookNameMap[ref.bookNumber] ?? `Book ${ref.bookNumber}`;
                  const sectionColor = SECTION_COLORS[catalog?.books?.find((b) => b.book_number === ref.bookNumber)?.section_key ?? 'ot'] ?? Colors.gold.primary;
                  return (
                    <TouchableOpacity
                      key={`${ref.bookNumber}:${ref.chapter}:${ref.verse}-${idx}`}
                      style={[xrStyles.refCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
                      activeOpacity={0.75}
                      onPress={() => handleNavigateToRef(ref)}
                    >
                      <View style={[xrStyles.refDot, { backgroundColor: sectionColor }]} />
                      <View style={xrStyles.refContent}>
                        <Text style={[xrStyles.refBook, { color: sectionColor }]} numberOfLines={1}>
                          {refBookName}
                        </Text>
                        <Text style={[xrStyles.refVerse, { color: colors.text.muted }]}>
                          {ref.displayRef}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={colors.text.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            ListHeaderComponent={
              <Text style={[xrStyles.totalRefs, { color: colors.text.secondary }]}>
                {crossRefs.length} reference{crossRefs.length !== 1 ? 's' : ''} found
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const xrStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerSub:     { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle:   { fontSize: Typography.size.lg, fontWeight: '700' as const },
  closeBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  stateTitle:    { fontSize: Typography.size.base, fontWeight: '600' as const, textAlign: 'center' },
  stateText:     { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
  listContent:   { padding: Spacing.lg, paddingBottom: 60 },
  totalRefs:     { fontSize: Typography.size.sm, marginBottom: Spacing.lg, textAlign: 'center' },
  group:         { marginBottom: Spacing.lg },
  groupHeader:   {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  groupLabel:    { fontSize: Typography.size.sm, fontWeight: '700' as const, letterSpacing: 0.5, textTransform: 'uppercase' },
  groupCount:    { fontSize: Typography.size.xs, fontWeight: '600' as const },
  refCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  refDot:        { width: 8, height: 8, borderRadius: 4 },
  refContent:    { flex: 1 },
  refBook:       { fontSize: Typography.size.base, fontWeight: '600' as const },
  refVerse:      { fontSize: Typography.size.xs, marginTop: 1 },
});

// ─── Main Bible Screen ───────────────────────────────────────────────────────

export default function BibleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { colors, fontOption } = useAppSettings();

  const versions = (bibleVersionsData as any).versions ?? [];
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem('wol_bible_version');
        return v ? JSON.parse(v) : versions[0];
      }
    } catch { /* ignore */ }
    return versions[0];
  });

  // Persist version selection to localStorage
  React.useEffect(() => {
    if (!selectedVersion) return;
    try { if (typeof window !== 'undefined') window.localStorage.setItem('wol_bible_version', JSON.stringify(selectedVersion)); } catch {}
  }, [selectedVersion]);

  const versionUrl = selectedVersion?.url ?? '/data/ekjv';

  const {
    catalog, currentBook, chapter, verses,
    loadingCatalog, loadingChapter, error,
    setBook, setChapter, goNextChapter, goPrevChapter,
  } = useBibleReader(500, 1, versionUrl);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showCrossReference, setShowCrossReference] = useState(false);

  // ── Highlights state ──
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // ── Notes state ──
  const [notes, setNotes] = useState<Record<number, { text: string; updatedAt: string }>>({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null);

  // Load annotations when chapter changes
  useEffect(() => {
    if (!currentBook || !chapter) return;
    let mounted = true;
    loadAnnotationsForChapter(currentBook.book_number, chapter).then((result) => {
      if (!mounted) return;
      setHighlights(result.highlights);
      setNotes(result.notes);
    });
    return () => { mounted = false; };
  }, [currentBook?.book_number, chapter]);

  const currentHighlight = useMemo(
    () => (selectedVerse !== null ? highlights[selectedVerse] ?? null : null),
    [highlights, selectedVerse],
  );

  const colorCrossRef = useMemo(
    () => (selectedVerse !== null ? '#5B8DEF' : colors.text.secondary),
    [selectedVerse, colors.text.secondary],
  );

  const currentNoteText = useMemo(
    () => (editingNoteVerse !== null ? notes[editingNoteVerse]?.text ?? '' : ''),
    [notes, editingNoteVerse],
  );

  const handleHighlightSelect = useCallback(async (color: string) => {
    if (!currentBook || selectedVerse === null) return;
    const verse = selectedVerse;
    await setHighlight(currentBook.book_number, chapter, verse, color);
    setHighlights((prev) => ({ ...prev, [verse]: color }));
  }, [currentBook, chapter, selectedVerse]);

  const handleHighlightRemove = useCallback(async () => {
    if (!currentBook || selectedVerse === null) return;
    const verse = selectedVerse;
    await setHighlight(currentBook.book_number, chapter, verse, null);
    setHighlights((prev) => {
      const next = { ...prev };
      delete next[verse];
      return next;
    });
  }, [currentBook, chapter, selectedVerse]);

  const handleNoteSave = useCallback(async (text: string) => {
    if (!currentBook || editingNoteVerse === null) return;
    const verse = editingNoteVerse;
    if (text) {
      await setNote(currentBook.book_number, chapter, verse, text);
      setNotes((prev) => ({ ...prev, [verse]: { text, updatedAt: new Date().toISOString() } }));
    } else {
      await setNote(currentBook.book_number, chapter, verse, null);
      setNotes((prev) => {
        const next = { ...prev };
        delete next[verse];
        return next;
      });
    }
    setShowNoteEditor(false);
    setEditingNoteVerse(null);
  }, [currentBook, chapter, editingNoteVerse]);

  const openHighlightPicker = useCallback(() => {
    if (selectedVerse !== null) {
      setShowHighlightPicker(true);
    }
  }, [selectedVerse]);

  const openNoteEditor = useCallback(() => {
    if (selectedVerse !== null) {
      setEditingNoteVerse(selectedVerse);
      setShowNoteEditor(true);
    }
  }, [selectedVerse]);

  const isPsalms = currentBook?.book_number === 230 || currentBook?.book_number === 753;
  const chapterLabel = isPsalms ? 'Psalm' : 'Chapter';
  const sectionColor = SECTION_COLORS[currentBook?.section_key ?? 'ot'] ?? Colors.gold.primary;

  // Tap a verse: toggle single selection (tap again to deselect)
  const toggleVerse = useCallback((v: number) => {
    setSelectedVerse((prev) => (prev === v ? null : v));
  }, []);

  const handleShare = useCallback(async () => {
    if (selectedVerse === null || !currentBook) return;
    const vr = verses.find((x) => x.verse === selectedVerse);
    const text = vr ? vr.text : '';
    await Share.share({ message: `${currentBook?.name?.trim() ?? ''} ${chapter}:${selectedVerse} (NS-KJV)\n\n${text}` });
    setSelectedVerse(null);
  }, [selectedVerse, currentBook, chapter, verses]);

  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), []);

  const handleNextChapter = useCallback(() => { goNextChapter(); scrollToTop(); }, [goNextChapter, scrollToTop]);
  const handlePrevChapter = useCallback(() => { goPrevChapter(); scrollToTop(); }, [goPrevChapter, scrollToTop]);

  const handleBookSelect = useCallback((book: CatalogBook) => {
    setBook(book); scrollToTop(); setSelectedVerse(null);
  }, [setBook, scrollToTop]);

  const handleChapterSelect = useCallback((n: number) => {
    setChapter(n); scrollToTop(); setSelectedVerse(null);
  }, [setChapter, scrollToTop]);

  const handleNavigateToRef = useCallback((book: CatalogBook, ch: number) => {
    setBook(book);
    setChapter(ch);
    setSelectedVerse(null);
    scrollToTop();
  }, [setBook, setChapter, scrollToTop]);

  const isLoading = loadingCatalog || loadingChapter;
  const maxChapter = currentBook?.chapter_count ?? 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.bg.secondary, colors.bg.primary]}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.passageSelector, { backgroundColor: colors.bg.card, borderColor: colors.gold.muted + '55' }]} onPress={() => setShowBookPicker(true)}>
            <BookOpen size={15} color={sectionColor} />
            <Text style={styles.passageBook} numberOfLines={1}>
              {currentBook?.name?.trim() ?? '—'}
            </Text>
            <ChevronDown size={14} color={Colors.text.muted} />
          </TouchableOpacity>

          <View style={styles.topRight}>
            {selectedVerse !== null && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                <Share2 size={18} color={sectionColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowVersionPicker(true)}>
              <BookOpen size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFontPanel((p) => !p)}>
              <Type size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowChapterPicker(true)}>
              <List size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {showFontPanel && (
          <View style={[styles.fontPanel, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <Text style={[styles.fontPanelLabel, { color: colors.text.secondary }]}>Text Size</Text>
            <View style={styles.fontBtns}>
              {FONT_SIZE_LABELS.map((fs) => (
                <TouchableOpacity
                  key={fs}
                  style={[styles.fontBtn, fontSize === fs && styles.fontBtnActive]}
                  onPress={() => { setFontSize(fs); setShowFontPanel(false); }}
                >
                  <Text style={[styles.fontBtnText, { fontSize: FONT_SIZES[fs] - 2 }, fontSize === fs && styles.fontBtnTextActive]}>
                    A
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.chapterBar}>
          <TouchableOpacity
            style={[styles.chapterNavBtn, chapter <= 1 && styles.chapterNavBtnDisabled]}
            onPress={handlePrevChapter}
            disabled={chapter <= 1}
          >
            <ChevronLeft size={18} color={chapter <= 1 ? Colors.text.muted : sectionColor} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.chapterLabel} onPress={() => setShowChapterPicker(true)}>
            <Text style={[styles.chapterLabelText, { color: colors.text.primary }]}>{chapterLabel} {chapter}</Text>
            {verses.length > 0 && <Text style={styles.chapterVerseCount}>{verses.length} verses</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chapterNavBtn, chapter >= maxChapter && styles.chapterNavBtnDisabled]}
            onPress={handleNextChapter}
            disabled={chapter >= maxChapter}
          >
            <ChevronRight size={18} color={chapter >= maxChapter ? Colors.text.muted : sectionColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />
      </LinearGradient>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={sectionColor} size="large" />
          <Text style={styles.loadingText}>
            {loadingCatalog ? 'Loading Bible...' : `Loading ${currentBook?.name?.trim() ?? ''}...`}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace('/bible')}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chapterHeading}>
            <Text style={[styles.chapterHeadingBook, { color: colors.text.muted }]}>{currentBook?.name?.trim()}</Text>
            <Text style={[styles.chapterHeadingNum, { color: colors.text.primary }]}>{chapterLabel} {chapter}</Text>
            <Text style={[styles.versionBadge, { color: sectionColor, borderColor: sectionColor + '55', backgroundColor: sectionColor + '18' }]}>
              {selectedVersion?.short_label ?? 'NS-KJV'}
            </Text>
          </View>

          {verses.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.loadingText}>No verses found for this chapter.</Text>
            </View>
          ) : (
            <View style={styles.versesContainer}>
              {verses.map((v) => {
                const isSelected = selectedVerse === v.verse;
                const highlightColor = highlights[v.verse] ?? null;
                const hasNote = notes[v.verse] !== undefined;
                return (
                  <TouchableOpacity
                    key={v.verse}
                    style={[
                      styles.verseRow,
                      isSelected && { backgroundColor: sectionColor + '18', borderRadius: Radius.md, paddingHorizontal: Spacing.sm },
                      highlightColor && {
                        backgroundColor: highlightColor + '28',
                        borderLeftWidth: 3,
                        borderLeftColor: highlightColor,
                        borderRadius: 0,
                        paddingHorizontal: Spacing.sm,
                      },
                    ]}
                    onPress={() => toggleVerse(v.verse)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.verseNumColumn}>
                      <Text style={[styles.verseNum, { color: isSelected ? sectionColor : Colors.gold.dim }]}>
                        {v.verse}
                      </Text>
                      {hasNote && (
                        <PenLine size={10} color={Colors.gold.primary} style={styles.noteIndicator} />
                      )}
                    </View>
                    <Text style={[styles.verseText, { fontSize: FONT_SIZES[fontSize], lineHeight: FONT_SIZES[fontSize] * 1.65, color: colors.text.primary, ...(fontOption.regular ? { fontFamily: fontOption.regular } : {}) }]}>
                      {v.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.bottomNavBtn, chapter <= 1 && styles.bottomNavBtnDisabled]}
              onPress={handlePrevChapter}
              disabled={chapter <= 1}
            >
              <ChevronLeft size={16} color={chapter <= 1 ? Colors.text.muted : sectionColor} />
              <Text style={[styles.bottomNavText, chapter <= 1 && styles.bottomNavTextMuted]}>Previous</Text>
            </TouchableOpacity>

            <View style={styles.bottomNavMid}>
              <Text style={styles.bottomNavMidText}>{chapter} / {maxChapter}</Text>
            </View>

            <TouchableOpacity
              style={[styles.bottomNavBtn, chapter >= maxChapter && styles.bottomNavBtnDisabled]}
              onPress={handleNextChapter}
              disabled={chapter >= maxChapter}
            >
              <Text style={[styles.bottomNavText, chapter >= maxChapter && styles.bottomNavTextMuted]}>Next</Text>
              <ChevronRight size={16} color={chapter >= maxChapter ? Colors.text.muted : sectionColor} />
            </TouchableOpacity>
          </View>


        </ScrollView>
      )}

      {/* ── Annotation Bar ── */}
      {selectedVerse !== null && currentBook && (
        <>
          <View style={[
            annot.bar,
            {
              bottom: insets.bottom + 12,
              borderColor: sectionColor + '55',
              backgroundColor: colors.bg.elevated,
              shadowColor: sectionColor,
            },
          ]}>
            <View style={annot.topRow}>
              <View style={[annot.countPill, { backgroundColor: sectionColor + '22', borderColor: sectionColor + '44' }]}>
                <Text style={[annot.countText, { color: sectionColor }]}>
                  Verse {selectedVerse}
                </Text>
              </View>
              <Text style={[annot.verseRef, { color: colors.text.muted }]} numberOfLines={1}>
                {currentBook.name?.trim() ?? ''} {chapter}:{selectedVerse}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={annot.smBtn} onPress={handleShare}>
                <Share2 size={15} color={sectionColor} />
              </TouchableOpacity>
              <TouchableOpacity style={annot.smBtn} onPress={() => setSelectedVerse(null)}>
                <X size={15} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <View style={[annot.toolRow, { borderTopColor: colors.border.subtle }]}>
              <TouchableOpacity style={annot.tool} onPress={() => setShowCommentary(true)}>
                <MessageSquare size={18} color={sectionColor} />
                <Text style={[annot.toolLabel, { color: sectionColor }]}>Commentary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={annot.tool} onPress={() => setShowCrossReference(true)}>
                <Link2 size={18} color={colorCrossRef} />
                <Text style={[annot.toolLabel, { color: colorCrossRef }]}>Cross-Ref</Text>
              </TouchableOpacity>
              <TouchableOpacity style={annot.tool} onPress={openHighlightPicker}>
                <Bookmark size={18} color={currentHighlight ? sectionColor : colors.text.secondary} />
                <Text style={[annot.toolLabel, { color: currentHighlight ? sectionColor : colors.text.secondary }]}>Highlight</Text>
              </TouchableOpacity>
              <TouchableOpacity style={annot.tool} onPress={openNoteEditor}>
                <PenLine size={18} color={notes[selectedVerse] ? sectionColor : colors.text.secondary} />
                <Text style={[annot.toolLabel, { color: notes[selectedVerse] ? sectionColor : colors.text.secondary }]}>Note</Text>
              </TouchableOpacity>
              <TouchableOpacity style={annot.tool} onPress={() => Alert.alert('Apologetics', 'Coming soon')}>
                <Shield size={18} color={colors.text.secondary} />
                <Text style={[annot.toolLabel, { color: colors.text.secondary }]}>Apologetics</Text>
              </TouchableOpacity>
            </View>
          </View>

          <CommentarySheet
            visible={showCommentary}
            bookNumber={currentBook.book_number}
            bookName={currentBook.name?.trim() ?? ''}
            chapter={chapter}
            verse={selectedVerse}
            onClose={() => setShowCommentary(false)}
          />

          <CrossReferenceSheet
            visible={showCrossReference}
            bookNumber={currentBook.book_number}
            bookName={currentBook.name?.trim() ?? ''}
            chapter={chapter}
            verse={selectedVerse}
            catalog={catalog}
            onClose={() => setShowCrossReference(false)}
            onNavigate={handleNavigateToRef}
          />

          <HighlightColorPicker
            visible={showHighlightPicker}
            currentHighlight={currentHighlight}
            onSelectColor={handleHighlightSelect}
            onRemove={handleHighlightRemove}
            onClose={() => setShowHighlightPicker(false)}
          />

          <NotesEditorModal
            visible={showNoteEditor}
            verseRef={`${currentBook.name?.trim() ?? ''} ${chapter}:${editingNoteVerse ?? selectedVerse}`}
            currentNote={currentNoteText}
            onSave={handleNoteSave}
            onClose={() => { setShowNoteEditor(false); setEditingNoteVerse(null); }}
          />
        </>
      )}

      <BookPicker
        visible={showBookPicker}
        catalog={catalog}
        currentBook={currentBook}
        onSelect={handleBookSelect}
        onClose={() => setShowBookPicker(false)}
      />
      <Modal visible={showVersionPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVersionPicker(false)}>
        <View style={[picker.root, { backgroundColor: colors.bg.primary }]}> 
          <View style={[picker.header, { borderBottomColor: colors.border.subtle }]}> 
            <Text style={[picker.title, { color: colors.text.primary }]}>Bible Versions</Text>
            <TouchableOpacity onPress={() => setShowVersionPicker(false)} style={picker.closeBtn}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={versions}
            keyExtractor={(item) => item.slug}
            contentContainerStyle={{ padding: Spacing.lg }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[picker.bookItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => { setSelectedVersion(item); setShowVersionPicker(false); }}
              >
                <View>
                  <Text style={{ fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: colors.text.primary }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.muted }}>{item.url}</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>{item.short_label}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </View>
      </Modal>
      <ChapterPicker
        visible={showChapterPicker}
        currentBook={currentBook}
        currentChapter={chapter}
        onSelect={handleChapterSelect}
        onClose={() => setShowChapterPicker(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:                  { flex: 1 },
  header:                { paddingHorizontal: Spacing.lg, paddingBottom: 0 },
  topRow:                { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.sm, gap: Spacing.sm },
  iconBtn:               { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  passageSelector:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bg.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold.muted + '55', paddingHorizontal: Spacing.md, paddingVertical: 8 },
  passageBook:           { flex: 1, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  topRight:              { flexDirection: 'row', alignItems: 'center' },
  fontPanel:             { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border.default, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  fontPanelLabel:        { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  fontBtns:              { flexDirection: 'row', gap: Spacing.sm },
  fontBtn:               { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center', justifyContent: 'center' },
  fontBtnActive:         { backgroundColor: Colors.gold.subtle, borderColor: Colors.gold.primary },
  fontBtnText:           { color: Colors.text.secondary, fontWeight: Typography.weight.bold },
  fontBtnTextActive:     { color: Colors.gold.light },
  chapterBar:            { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  chapterNavBtn:         { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center', justifyContent: 'center' },
  chapterNavBtnDisabled: { opacity: 0.35 },
  chapterLabel:          { flex: 1, alignItems: 'center', gap: 1 },
  chapterLabelText:      { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  chapterVerseCount:     { fontSize: Typography.size.xs, color: Colors.text.muted },
  headerDivider:         { height: 1, backgroundColor: Colors.border.subtle },
  centered:              { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
  loadingText:           { fontSize: Typography.size.sm, color: Colors.text.muted, textAlign: 'center' },
  errorText:             { fontSize: Typography.size.base, color: Colors.status.error, textAlign: 'center' },
  retryBtn:              { backgroundColor: Colors.gold.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  retryText:             { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.bg.primary },
  scroll:                { flex: 1 },
  scrollContent:         { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  chapterHeading:        { alignItems: 'center', paddingBottom: Spacing.xl, gap: 4, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle, marginBottom: Spacing.lg },
  chapterHeadingBook:    { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  chapterHeadingNum:     { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary, letterSpacing: 0.5 },
  versionBadge:          { fontSize: 10, fontWeight: Typography.weight.bold, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, letterSpacing: 1, borderWidth: 1 },
  versesContainer:       { gap: 0 },
  verseRow:              { flexDirection: 'row', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle + '60', gap: Spacing.md, borderRadius: Radius.sm },
  verseNumColumn:        { alignItems: 'center', minWidth: 22, paddingTop: 3 },
  verseNum:              { fontSize: 11, fontWeight: Typography.weight.bold, textAlign: 'right' },
  noteIndicator:         { marginTop: 2, opacity: 0.7 },
  verseText:             { flex: 1, color: Colors.text.primary },
  bottomNav:             { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xxxl, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.subtle, marginBottom: Spacing.md },
  bottomNavBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, paddingVertical: Spacing.md, backgroundColor: Colors.bg.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default, justifyContent: 'center' },
  bottomNavBtnDisabled:  { opacity: 0.3 },
  bottomNavText:         { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.gold.light },
  bottomNavTextMuted:    { color: Colors.text.muted },
  bottomNavMid:          { flex: 1, alignItems: 'center' },
  bottomNavMidText:      { fontSize: Typography.size.xs, color: Colors.text.muted },
  selectionBar:          { position: 'absolute', bottom: 100, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.bg.elevated, borderRadius: Radius.xl, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  selectionCount:        { flex: 1, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  selectionAction:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.bg.card, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default },
  selectionActionText:   { fontSize: Typography.size.sm, color: Colors.text.secondary },
});

// ─── Commentary sheet styles ─────────────────────────────────────────────────
const cStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerSub:     { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle:   { fontSize: Typography.size.lg, fontWeight: '700' as const },
  closeBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  stateTitle:    { fontSize: Typography.size.base, fontWeight: '600' as const, textAlign: 'center' },
  stateText:     { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
  listContent:   { padding: Spacing.lg, paddingBottom: 60 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sourceBadge:  { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  sourceText:   { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  verseRefText: { fontSize: 11 },
  preview:      { fontSize: Typography.size.sm, lineHeight: 20 },
  readMore:     { fontSize: 11, fontWeight: '600' as const, textAlign: 'right' },
});

// ─── Annotation bar styles ────────────────────────────────────────────────────
const annot = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    gap: Spacing.xs,
  },
  countPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontSize: 11, fontWeight: '600' as const },
  verseRef: { fontSize: 10, flex: 1, marginLeft: Spacing.sm },
  smBtn: { width: 30, height: 30, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  tool:      { alignItems: 'center', gap: 3, flex: 1, paddingVertical: 4 },
  toolLabel: { fontSize: 9, fontWeight: '600' as const },
});

const picker = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg.primary },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  title:          { flex: 1, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  closeBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 0, backgroundColor: Colors.bg.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border.default, paddingHorizontal: Spacing.md, height: 42 },
  input:          { flex: 1, fontSize: Typography.size.base, color: Colors.text.primary },
  // height: 56 keeps tabs at a fixed size so the FlatList below is never pushed off screen
  tabsRow:        { height: 56, flexGrow: 0, flexShrink: 0 },
  tabsContent:    { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  sectionTab:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  tabDot:         { width: 6, height: 6, borderRadius: 3 },
  sectionTabText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },
  tabCount:       { fontSize: 10, color: Colors.text.muted, fontWeight: Typography.weight.medium },
  // flex: 1 makes the list fill all remaining space — prevents overlap with tabs above
  listContainer:  { flex: 1 },
  listContent:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  bookItem:       { flex: 1, margin: 4, backgroundColor: Colors.bg.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.subtle, padding: Spacing.sm, alignItems: 'center', minHeight: 76, justifyContent: 'center', gap: 2 },
  bookShort:      { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  bookName:       { fontSize: 9, color: Colors.text.secondary, textAlign: 'center', lineHeight: 12 },
  bookChapters:   { fontSize: 9, color: Colors.text.muted },
  empty:          { paddingVertical: Spacing.xxxl, alignItems: 'center' },
  emptyText:      { fontSize: Typography.size.sm, color: Colors.text.muted },
  chapterItem:    { flex: 1, margin: 4, backgroundColor: Colors.bg.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.subtle, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  chapterNum:     { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.text.secondary },
});
