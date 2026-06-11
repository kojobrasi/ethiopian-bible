import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, Modal, Alert, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Upload, BookText, FileText, Trash2,
  BookOpen, ExternalLink,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAppSettings } from '@/contexts/AppContext';
import {
  loadShelf, addBookToShelf, removeBookFromShelf, readBookContent,
  formatFileSize, formatDate, type SavedBook,
} from '@/lib/readerStorage';
import { generateEpubViewerHtml, generatePdfViewerHtml } from '@/lib/epubViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / 2;

export default function ReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppSettings();

  const [shelf, setShelf] = useState<SavedBook[]>([]);
  const [loadingShelf, setLoadingShelf] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Reading modal state
  const [readingBook, setReadingBook] = useState<SavedBook | null>(null);
  const [readingMode, setReadingMode] = useState<'none' | 'loading' | 'ready'>('none');
  const [bookContent, setBookContent] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState({ current: 0, total: 0, pct: 0 });

  // Load shelf on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const books = await loadShelf();
      if (mounted) {
        setShelf(books);
        setLoadingShelf(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf', 'ebook/epub'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileType: 'epub' | 'pdf' = asset.mimeType?.includes('pdf') ? 'pdf' : 'epub';
      const title = asset.name?.replace(/\.(epub|pdf)$/i, '') || asset.name || 'Untitled';

      const book = await addBookToShelf(title, fileType, asset.uri, asset.size || 0);
      setShelf((prev) => [book, ...prev]);
      setUploading(false);
    } catch (err) {
      setUploading(false);
      Alert.alert('Upload Error', 'Could not import the file. Please try again.');
    }
  }, []);

  const handleRemoveBook = useCallback((book: SavedBook) => {
    Alert.alert(
      'Remove Book',
      `Delete "${book.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeBookFromShelf(book.id);
            setShelf((prev) => prev.filter((b) => b.id !== book.id));
            if (readingBook?.id === book.id) {
              setReadingBook(null);
              setReadingMode('none');
              setBookContent(null);
            }
          },
        },
      ],
    );
  }, [readingBook]);

  const handleOpenBook = useCallback(async (book: SavedBook) => {
    setReadingBook(book);
    setReadingMode('loading');
    setReadingProgress({ current: 0, total: 0, pct: 0 });

    try {
      const content = await readBookContent(book.fileUri);
      setBookContent(content);
      setReadingMode('ready');
    } catch {
      Alert.alert('Error', 'Could not open this file. It may be corrupted or in an unsupported format.');
      setReadingBook(null);
      setReadingMode('none');
      setBookContent(null);
    }
  }, []);

  const handleReadingProgress = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'progress') {
        setReadingProgress({
          current: Math.floor(data.currentPage || 0),
          total: Math.floor(data.totalPages || 0),
          pct: data.percentage || 0,
        });
      }
    } catch {}
  }, []);

  const handleCloseReading = useCallback(() => {
    setReadingBook(null);
    setReadingMode('none');
    setBookContent(null);
    setReadingProgress({ current: 0, total: 0, pct: 0 });
  }, []);

  const readerHtml = useMemo(() => {
    if (!bookContent || !readingBook) return '';
    if (readingBook.fileType === 'epub') {
      return generateEpubViewerHtml(bookContent);
    }
    return generatePdfViewerHtml(bookContent);
  }, [bookContent, readingBook]);

  const renderBookCard = useCallback(({ item }: { item: SavedBook }) => {
    const isReading = readingBook?.id === item.id;
    const progress = item.currentPage && item.totalPages
      ? Math.round((item.currentPage / item.totalPages) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={[
          shelfStyles.card,
          { backgroundColor: colors.bg.card, borderColor: isReading ? Colors.gold.primary : colors.border.default },
        ]}
        activeOpacity={0.7}
        onPress={() => handleOpenBook(item)}
        onLongPress={() => handleRemoveBook(item)}
      >
        {/* File type icon */}
        <View style={[shelfStyles.iconWrap, { backgroundColor: item.fileType === 'epub' ? '#3A7BD5' + '22' : '#C0392B' + '22' }]}>
          {item.fileType === 'epub' ? (
            <BookOpen size={24} color="#3A7BD5" />
          ) : (
            <FileText size={24} color="#C0392B" />
          )}
        </View>

        {/* Title */}
        <Text style={[shelfStyles.title, { color: colors.text.primary }]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Meta */}
        <View style={shelfStyles.metaRow}>
          <View style={[shelfStyles.badge, { backgroundColor: item.fileType === 'epub' ? '#3A7BD5' + '18' : '#C0392B' + '18' }]}>
            <Text style={[shelfStyles.badgeText, { color: item.fileType === 'epub' ? '#3A7BD5' : '#C0392B' }]}>
              {item.fileType.toUpperCase()}
            </Text>
          </View>
          <Text style={[shelfStyles.sizeText, { color: colors.text.muted }]}>
            {formatFileSize(item.fileSize)}
          </Text>
        </View>

        {/* Progress bar */}
        {progress > 0 && (
          <View style={shelfStyles.progressContainer}>
            <View style={[shelfStyles.progressBar, { backgroundColor: colors.border.subtle }]}>
              <View style={[shelfStyles.progressFill, { width: `${progress}%`, backgroundColor: Colors.gold.primary }]} />
            </View>
            <Text style={[shelfStyles.progressText, { color: colors.text.muted }]}>{progress}%</Text>
          </View>
        )}

        {/* Date */}
        <Text style={[shelfStyles.dateText, { color: colors.text.muted }]}>
          {formatDate(item.addedAt)}
        </Text>

        {/* Delete overlay on long press hint */}
        <View style={shelfStyles.deleteHint}>
          <Trash2 size={12} color={colors.status.error + '66'} />
        </View>
      </TouchableOpacity>
    );
  }, [colors, readingBook, handleOpenBook, handleRemoveBook]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.bg.secondary, colors.bg.primary]}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <BookText size={18} color={Colors.gold.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>Reader</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: Colors.gold.primary + '18', borderColor: Colors.gold.primary + '44' }]} onPress={handleUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={Colors.gold.primary} size="small" />
            ) : (
              <>
                <Upload size={14} color={Colors.gold.primary} />
                <Text style={styles.uploadText}>Add Book</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.text.muted }]}>
          Upload EPUB or PDF files to read offline
        </Text>
      </LinearGradient>

      {/* ── Upload Section ── */}
      <TouchableOpacity
        style={[styles.uploadCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        activeOpacity={0.7}
        onPress={handleUpload}
      >
        <View style={[styles.uploadIconWrap, { backgroundColor: Colors.gold.primary + '15' }]}>
          <Upload size={24} color={Colors.gold.primary} />
        </View>
        <View style={styles.uploadTextWrap}>
          <Text style={[styles.uploadTitle, { color: colors.text.primary }]}>Upload a book</Text>
          <Text style={[styles.uploadDesc, { color: colors.text.muted }]}>Select an EPUB or PDF file from your device to read offline</Text>
        </View>
        <ExternalLink size={16} color={colors.text.muted} />
      </TouchableOpacity>

      {/* ── Shelf Section ── */}
      <View style={styles.sectionHeader}>
        <BookText size={16} color={Colors.gold.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>My Library</Text>
        <View style={[styles.sectionCount, { backgroundColor: Colors.gold.primary + '18' }]}>
          <Text style={[styles.sectionCountText, { color: Colors.gold.primary }]}>{shelf.length}</Text>
        </View>
      </View>

      {loadingShelf ? (
        <View style={styles.centeredFill}>
          <ActivityIndicator color={Colors.gold.primary} size="large" />
          <Text style={[styles.emptyText, { color: colors.text.muted }]}>Loading library...</Text>
        </View>
      ) : shelf.length === 0 ? (
        <View style={styles.centeredFill}>
          <BookText size={48} color={colors.text.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Your library is empty</Text>
          <Text style={[styles.emptyDesc, { color: colors.text.secondary }]}>
            Tap "Add Book" or the upload card above to import EPUB or PDF files
          </Text>
        </View>
      ) : (
        <FlatList
          data={shelf}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={shelfStyles.row}
          contentContainerStyle={shelfStyles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderBookCard}
          style={styles.shelfList}
        />
      )}

      {/* ── Reading Modal ── */}
      <Modal visible={readingBook !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseReading}>
        <View style={{ flex: 1, backgroundColor: readingBook?.fileType === 'epub' ? '#FAFAF4' : '#525659' }}>
          {/* Reading header */}
          <View style={[readStyles.header, { backgroundColor: colors.bg.elevated }]}>
            <TouchableOpacity style={readStyles.backBtn} onPress={handleCloseReading}>
              <ChevronLeft size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={readStyles.headerCenter}>
              <Text style={[readStyles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
                {readingBook?.title || 'Reading'}
              </Text>
              {readingProgress.total > 0 && (
                <Text style={[readStyles.headerProgress, { color: Colors.gold.primary }]}>
                  Page {readingProgress.current} of {readingProgress.total}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }} />
            {/* Progress indicator */}
            {readingProgress.total > 0 && (
              <View style={[readStyles.progressDot, {
                backgroundColor: readingProgress.pct > 90 ? '#2E8B57' : readingProgress.pct > 50 ? Colors.gold.primary : colors.text.muted,
              }]} />
            )}
          </View>

          {/* Progress bar below header */}
          {readingProgress.total > 0 && (
            <View style={[readStyles.progressLine, { backgroundColor: colors.border.subtle }]}>
              <View style={[readStyles.progressFill, { width: `${Math.min(100, readingProgress.pct)}%`, backgroundColor: Colors.gold.primary }]} />
            </View>
          )}

          {/* Content */}
          {readingMode === 'loading' && (
            <View style={readStyles.loadingState}>
              <ActivityIndicator color={Colors.gold.primary} size="large" />
              <Text style={[readStyles.loadingText, { color: readingBook?.fileType === 'epub' ? '#1C1408' : '#F0F4FF' }]}>
                Loading {readingBook?.fileType?.toUpperCase()}...
              </Text>
            </View>
          )}

          {readingMode === 'ready' && readerHtml && (
            <WebView
              source={{ html: readerHtml }}
              style={readStyles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              mixedContentMode="always"
              onMessage={handleReadingProgress}
              startInLoadingState
              renderLoading={() => (
                <View style={readStyles.loadingState}>
                  <ActivityIndicator color={Colors.gold.primary} size="large" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, flex: 1 },
  subtitle: { fontSize: Typography.size.sm, marginTop: 2, paddingLeft: 36 + Spacing.sm },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1,
  },
  uploadText: { fontSize: Typography.size.sm, fontWeight: '600' as const, color: Colors.gold.primary },

  uploadCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.md,
  },
  uploadIconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  uploadTextWrap: { flex: 1 },
  uploadTitle: { fontSize: Typography.size.base, fontWeight: '600' as const },
  uploadDesc: { fontSize: Typography.size.sm, marginTop: 2, lineHeight: 17 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  sectionTitle: { fontSize: Typography.size.base, fontWeight: '700' as const, flex: 1 },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: Typography.size.xs, fontWeight: '700' as const },

  centeredFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: '600' as const, textAlign: 'center' },
  emptyText: { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl },
  emptyDesc: { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl },
  shelfList: { flex: 1, paddingHorizontal: Spacing.lg },
});

const shelfStyles = StyleSheet.create({
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  listContent: { paddingBottom: Spacing.xxxl },
  card: {
    width: CARD_WIDTH,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    position: 'relative',
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, marginBottom: Spacing.sm, minHeight: 36 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.5 },
  sizeText: { fontSize: 10 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  progressBar: { flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 1.5 },
  progressText: { fontSize: 9 },
  dateText: { fontSize: 9, marginTop: Spacing.xs },
  deleteHint: { position: 'absolute', top: 6, right: 6, opacity: 0.4 },
});

const readStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: Typography.size.base, fontWeight: '600' as const },
  headerProgress: { fontSize: 11, marginTop: 1 },
  progressDot: { width: 8, height: 8, borderRadius: 4, marginLeft: Spacing.sm },
  progressLine: { height: 2, overflow: 'hidden' },
  progressFill: { height: 2 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.size.sm },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
