import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings, BookOpen, Trophy, Bell, Moon, Sun,
  Type, Check, ChevronRight, Star, X, Crown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type QuizScore } from '@/lib/supabase';
import BottomTabBar from '@/components/BottomTabBar';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { useAppSettings, FONT_OPTIONS, type FontOption, type AppTheme } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradeModal from '@/components/UpgradeModal';

// ─── Font Picker Modal ────────────────────────────────────────────────────────

function FontPickerModal({
  visible,
  currentFont,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentFont: FontOption;
  onSelect: (f: FontOption) => void;
  onClose: () => void;
}) {
  const { colors } = useAppSettings();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalRoot, { backgroundColor: colors.bg.primary }]}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Choose Font</Text>
          <TouchableOpacity onPress={onClose} style={s.modalClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={FONT_OPTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.fontList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.key === currentFont.key;
            const sampleStyle = item.regular ? { fontFamily: item.regular } : {};
            return (
              <TouchableOpacity
                style={[s.fontItem, active && { borderColor: colors.gold.primary, backgroundColor: colors.gold.subtle }]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={s.fontItemContent}>
                  <Text style={[s.fontItemLabel, { color: active ? colors.gold.light : colors.text.primary }, sampleStyle]}>
                    {item.label}
                  </Text>
                  <Text style={[s.fontItemSample, { color: colors.text.secondary }, sampleStyle]}>
                    The word of God is alive and active.
                  </Text>
                </View>
                {active && (
                  <View style={[s.fontCheckIcon, { backgroundColor: colors.gold.primary }]}>
                    <Check size={12} color={colors.text.inverse} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    colors,
    theme,
    setTheme,
    fontOption,
    setFontOption,
    pushNotifications,
    setPushNotifications,
    verseOfDayNotifications,
    setVerseOfDayNotifications,
  } = useAppSettings();
  const { isPro, status } = useSubscription();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quiz_scores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setScores(data);
      setLoadingScores(false);
    })();
  }, []);

  const bestScore = scores.length > 0 ? Math.max(...scores.map((s) => Number(s.percentage))) : null;

  const THEME_OPTIONS: { key: AppTheme; label: string; icon: typeof Moon }[] = [
    { key: 'dark',  label: 'Dark',  icon: Moon },
    { key: 'light', label: 'Light', icon: Sun  },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={[colors.bg.secondary, colors.bg.primary]}
        style={[s.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={s.headerRow}>
          <Settings size={20} color={colors.text.secondary} />
          <Text style={s.headerTitle}>Settings</Text>
        </View>
        <View style={s.divider} />
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App info card */}
        <View style={s.appCard}>
          <View style={s.appIcon}>
            <BookOpen size={28} color={colors.gold.primary} strokeWidth={1.8} />
          </View>
          <View>
            <Text style={s.appName}>Word of Life</Text>
            <Text style={s.appVersion}>Version 1.0.0 · Bible Reference</Text>
          </View>
        </View>

        {/* ── UPGRADE / REMOVE ADS ── */}
        {!isPro && status !== 'loading' && (
          <TouchableOpacity style={[s.upgradeCard, { backgroundColor: colors.gold.subtle, borderColor: colors.gold.primary + '66' }]} activeOpacity={0.7} onPress={() => setShowUpgradeModal(true)}>
            <View style={[s.upgradeIconWrap, { backgroundColor: colors.gold.primary + '22' }]}>
              <Crown size={22} color={colors.gold.primary} />
            </View>
            <View style={s.upgradeTextWrap}>
              <Text style={[s.upgradeTitle, { color: colors.gold.light }]}>Go Premium</Text>
              <Text style={[s.upgradeDesc, { color: colors.text.secondary }]}>Remove ads & unlock all study features</Text>
            </View>
            <ChevronRight size={16} color={colors.gold.primary} />
          </TouchableOpacity>
        )}

        {/* ── APPEARANCE ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>APPEARANCE</Text>
          <View style={s.card}>

            {/* Theme toggle */}
            <View style={s.appearanceRow}>
              <View style={[s.prefIconWrap, { backgroundColor: colors.bg.elevated }]}>
                {theme === 'dark'
                  ? <Moon size={16} color={colors.gold.primary} strokeWidth={2} />
                  : <Sun  size={16} color={colors.gold.primary} strokeWidth={2} />
                }
              </View>
              <View style={s.prefText}>
                <Text style={s.prefLabel}>Theme</Text>
                <Text style={s.prefDesc}>Choose your display theme</Text>
              </View>
            </View>
            <View style={s.themeSelector}>
              {THEME_OPTIONS.map(({ key, label, icon: Icon }) => {
                const active = theme === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.themeOption,
                      { borderColor: active ? colors.gold.primary : colors.border.default },
                      active && { backgroundColor: colors.gold.subtle },
                    ]}
                    onPress={() => setTheme(key)}
                  >
                    <Icon
                      size={18}
                      color={active ? colors.gold.primary : colors.text.muted}
                      strokeWidth={2}
                    />
                    <Text style={[s.themeOptionLabel, { color: active ? colors.gold.light : colors.text.secondary }]}>
                      {label}
                    </Text>
                    {active && (
                      <View style={[s.themeCheck, { backgroundColor: colors.gold.primary }]}>
                        <Check size={9} color={colors.text.inverse} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.rowDivider, { backgroundColor: colors.border.subtle }]} />

            {/* Font picker */}
            <TouchableOpacity style={s.appearanceRow} onPress={() => setShowFontPicker(true)}>
              <View style={[s.prefIconWrap, { backgroundColor: colors.bg.elevated }]}>
                <Type size={16} color={colors.gold.primary} strokeWidth={2} />
              </View>
              <View style={s.prefText}>
                <Text style={s.prefLabel}>Reading Font</Text>
                <Text style={[s.prefDesc, fontOption.regular ? { fontFamily: fontOption.regular } : {}]}>
                  {fontOption.label}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.muted} />
            </TouchableOpacity>

          </View>
        </View>

        {/* ── NOTIFICATIONS ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
          <View style={s.card}>
            {[
              { label: 'Push Notifications', desc: 'Enable in-app devotional alerts', icon: Bell, value: pushNotifications, onChange: setPushNotifications },
              { label: 'Verse of the Day',    desc: 'Morning at 12:00am and evening at 6:00pm', icon: BookOpen, value: verseOfDayNotifications, onChange: setVerseOfDayNotifications },
            ].map(({ label, desc, icon: Icon, value, onChange }, i, arr) => (
              <View key={label}>
                <View style={s.prefRow}>
                  <View style={s.prefIconWrap}>
                    <Icon size={16} color={colors.gold.primary} strokeWidth={2} />
                  </View>
                  <View style={s.prefText}>
                    <Text style={s.prefLabel}>{label}</Text>
                    <Text style={s.prefDesc}>{desc}</Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border.default, true: colors.gold.muted }}
                    thumbColor={value ? colors.gold.primary : colors.text.muted}
                  />
                </View>
                {i < arr.length - 1 && <View style={[s.rowDivider, { backgroundColor: colors.border.subtle }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* ── QUIZ PERFORMANCE ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUIZ PERFORMANCE</Text>
          <View style={s.card}>
            {loadingScores ? (
              <ActivityIndicator color={colors.gold.primary} style={{ padding: Spacing.lg }} />
            ) : scores.length === 0 ? (
              <View style={s.emptyScores}>
                <Trophy size={28} color={colors.text.muted} strokeWidth={1.5} />
                <Text style={s.emptyScoresText}>No quizzes completed yet</Text>
              </View>
            ) : (
              <>
                <View style={s.scoreStats}>
                  <View style={s.statBox}>
                    <Text style={s.statValue}>{scores.length}</Text>
                    <Text style={s.statLabel}>Attempts</Text>
                  </View>
                  <View style={[s.statDivider, { backgroundColor: colors.border.subtle }]} />
                  <View style={s.statBox}>
                    <Text style={s.statValue}>{bestScore?.toFixed(0)}%</Text>
                    <Text style={s.statLabel}>Best Score</Text>
                  </View>
                  <View style={[s.statDivider, { backgroundColor: colors.border.subtle }]} />
                  <View style={s.statBox}>
                    <Text style={s.statValue}>
                      {(scores.reduce((a, sc) => a + Number(sc.percentage), 0) / scores.length).toFixed(0)}%
                    </Text>
                    <Text style={s.statLabel}>Average</Text>
                  </View>
                </View>
                {scores.slice(0, 3).map((sc) => (
                  <View key={sc.id} style={s.scoreRow}>
                    <Trophy size={14} color={Number(sc.percentage) >= 70 ? colors.gold.primary : colors.text.muted} />
                    <Text style={s.scoreCategory}>{sc.category}</Text>
                    <Text style={s.scoreResult}>{sc.score}/{sc.total}</Text>
                    <Text style={[s.scorePct, { color: Number(sc.percentage) >= 70 ? colors.gold.light : colors.status.error }]}>
                      {Number(sc.percentage).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* ── ABOUT ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ABOUT</Text>
          <View style={s.card}>
            {[
              { label: 'App Version', value: '1.0.0' },
              { label: 'Build',       value: 'Expo SDK 54' },
              { label: 'Bible Text',  value: 'NS-KJV (91 books)' },
              { label: 'Platform',    value: 'iOS, Android & Web' },
            ].map(({ label, value }, i, arr) => (
              <View key={label}>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoValue}>{value}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.rowDivider, { backgroundColor: colors.border.subtle }]} />}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[s.rateBtn, { backgroundColor: '#F39C12' }]}>
          <Star size={16} color={colors.text.inverse} fill={colors.text.inverse} />
          <Text style={[s.rateBtnText, { color: colors.text.inverse }]}>Rate this App</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar />

      <FontPickerModal
        visible={showFontPicker}
        currentFont={fontOption}
        onSelect={setFontOption}
        onClose={() => setShowFontPicker(false)}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </View>
  );
}

// ─── Dynamic styles (rebuilt when colors change) ──────────────────────────────

function makeStyles(colors: ReturnType<typeof useAppSettings>['colors']) {
  return StyleSheet.create({
    root:              { flex: 1 },
    header:            { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    headerRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    headerTitle:       { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: colors.text.primary },
    divider:           { height: 1, backgroundColor: colors.border.subtle },
    scroll:            { flex: 1 },
    scrollContent:     { padding: Spacing.lg, gap: Spacing.xl },
    appCard:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: colors.bg.card, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: colors.gold.muted + '55' },
    appIcon:           { width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: colors.gold.subtle, borderWidth: 1, borderColor: colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
    appName:           { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: colors.text.primary },
    appVersion:        { fontSize: Typography.size.sm, color: colors.text.muted, marginTop: 2 },
    section:           { gap: Spacing.md },
    sectionLabel:      { fontSize: 10, fontWeight: Typography.weight.bold, color: colors.text.muted, letterSpacing: 2, paddingLeft: 2 },
    card:              { backgroundColor: colors.bg.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden' },
    // Appearance
    appearanceRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    themeSelector:     { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    themeOption:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, position: 'relative' },
    themeOptionLabel:  { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
    themeCheck:        { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    // Preferences
    prefRow:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    prefIconWrap:      { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: colors.gold.subtle, borderWidth: 1, borderColor: colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
    prefText:          { flex: 1 },
    prefLabel:         { fontSize: Typography.size.base, fontWeight: Typography.weight.medium, color: colors.text.primary },
    prefDesc:          { fontSize: Typography.size.xs, color: colors.text.muted, marginTop: 1 },
    rowDivider:        { height: 1, marginHorizontal: Spacing.md },
    // Quiz
    emptyScores:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
    emptyScoresText:   { fontSize: Typography.size.sm, color: colors.text.muted },
    scoreStats:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
    statBox:           { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
    statValue:         { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: colors.gold.light },
    statLabel:         { fontSize: 10, color: colors.text.muted, marginTop: 2 },
    statDivider:       { width: 1 },
    scoreRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle },
    scoreCategory:     { flex: 1, fontSize: Typography.size.sm, color: colors.text.secondary },
    scoreResult:       { fontSize: Typography.size.sm, color: colors.text.muted },
    scorePct:          { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, minWidth: 36, textAlign: 'right' },
    // Info
    infoRow:           { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md },
    infoLabel:         { fontSize: Typography.size.base, color: colors.text.secondary },
    infoValue:         { fontSize: Typography.size.base, color: colors.text.muted },
    // Upgrade card
    upgradeCard:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.xs },
    upgradeIconWrap:   { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    upgradeTextWrap:   { flex: 1 },
    upgradeTitle:      { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
    upgradeDesc:       { fontSize: Typography.size.sm, lineHeight: 18, marginTop: 1 },
    // Rate button
    rateBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md },
    rateBtnText:       { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
    // Font picker modal
    modalRoot:         { flex: 1 },
    modalHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
    modalTitle:        { flex: 1, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: colors.text.primary },
    modalClose:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    fontList:          { padding: Spacing.lg, gap: Spacing.sm },
    fontItem:          { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: colors.bg.card, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: colors.border.subtle },
    fontItemContent:   { flex: 1, gap: 4 },
    fontItemLabel:     { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
    fontItemSample:    { fontSize: Typography.size.sm, lineHeight: 20 },
    fontCheckIcon:     { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  });
}
