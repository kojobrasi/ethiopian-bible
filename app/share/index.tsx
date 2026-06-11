import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Share2, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const APP_URL = 'https://apps.apple.com/app/word-of-life';
const APP_DESCRIPTION = 'I\'m using Word of Life — an amazing Bible reference app! Read scriptures, devotionals, study tools and more. Download it free!';

export default function ShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      await Share.share({ message: `${APP_DESCRIPTION}\n\n${APP_URL}`, title: 'Word of Life Bible App' });
    } catch {}
  };

  const handleCopy = () => {
    Alert.alert('Copied!', 'App link copied to clipboard.');
  };

  const options = [
    { id: 'native', label: 'Share App', desc: 'Share via your device\'s share sheet', icon: Share2, color: '#3A7BD5', action: handleShare },
    { id: 'copy', label: 'Copy Link', desc: 'Copy the app link to clipboard', icon: Copy, color: '#27AE60', action: handleCopy },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Share2 size={16} color="#2980B9" />
          <Text style={styles.title}>Share App</Text>
        </View>
        <View style={styles.divider} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Share2 size={36} color={Colors.gold.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>Spread the Word</Text>
          <Text style={styles.heroDesc}>Help others grow in faith by sharing this app with friends, family, and your church community.</Text>
        </View>

        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <TouchableOpacity key={opt.id} style={styles.optionCard} onPress={opt.action} activeOpacity={0.8}>
              <View style={[styles.optionIcon, { backgroundColor: opt.color + '22', borderColor: opt.color + '55' }]}>
                <Icon size={24} color={opt.color} strokeWidth={1.8} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  content: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  hero: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.gold.subtle, borderWidth: 1, borderColor: Colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary },
  heroDesc: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.lg },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.subtle },
  optionIcon: { width: 52, height: 52, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  optionDesc: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 2 },
});
