import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

const STORE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/app/id000000000'
  : 'https://play.google.com/store/apps/details?id=com.wordoflife.app';

export default function RateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = React.useState(5);

  const handleRate = async () => {
    await WebBrowser.openBrowserAsync(STORE_URL);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <Star size={16} color="#F39C12" />
          <Text style={styles.title}>Rate App</Text>
        </View>
        <View style={styles.divider} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.stars}>
            {[1,2,3,4,5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setSelected(i)}>
                <Star size={44} color={i <= selected ? '#F39C12' : Colors.border.bright} fill={i <= selected ? '#F39C12' : 'transparent'} strokeWidth={1.5} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.heroTitle}>{selected >= 5 ? 'Loving it!' : selected >= 4 ? 'Great!' : selected >= 3 ? 'It\'s okay' : 'Help us improve'}</Text>
          <Text style={styles.heroDesc}>
            {selected >= 4
              ? 'We\'re glad you enjoy Word of Life! Your rating on the app store helps others discover this resource.'
              : 'We\'d love to hear your feedback. Your rating helps us improve the app for everyone.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.rateBtn} onPress={handleRate}>
          <Star size={18} color={Colors.text.inverse} fill={Colors.text.inverse} />
          <Text style={styles.rateBtnText}>Rate on {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.laterBtn} onPress={() => router.back()}>
          <Text style={styles.laterBtnText}>Maybe Later</Text>
        </TouchableOpacity>
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
  content: { flex: 1, padding: Spacing.xl, gap: Spacing.xl, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.lg },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  heroTitle: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary },
  heroDesc: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: '#F39C12', borderRadius: Radius.lg, paddingVertical: Spacing.lg },
  rateBtnText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.inverse },
  laterBtn: { borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  laterBtnText: { fontSize: Typography.size.base, color: Colors.text.muted, fontWeight: Typography.weight.medium },
});
