/**
 * UpgradeModal — prompts the user to subscribe for an ad-free, full-feature experience.
 *
 * Shows available plans (monthly, annual, lifetime) and handles purchase flow.
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crown, X, Check, Shield } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PRODUCT_IDS } from '@/config/subscriptions';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAppSettings } from '@/contexts/AppContext';

type UpgradeModalProps = {
  visible: boolean;
  onClose: () => void;
};

type PlanOption = {
  id: string;
  title: string;
  subtitle: string;
  price: string; // display price string
  originalPrice?: string;
  badge?: string;
  savings?: string;
};

export default function UpgradeModal({ visible, onClose }: UpgradeModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppSettings();
  const { offerings, purchase, restorePurchases, isPro, status } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Build plan list from RevenueCat offerings
  const plans: PlanOption[] = useMemo(() => {
    const current = offerings?.current;
    if (!current) {
      // Fallback static plans if offerings not loaded
      return [
        { id: PRODUCT_IDS.MONTHLY, title: 'Monthly', subtitle: 'Full access, month-to-month', price: '$4.99 / mo' },
        { id: PRODUCT_IDS.ANNUAL, title: 'Annual', subtitle: 'Full access, best value', price: '$29.99 / yr', originalPrice: '$59.88', badge: 'Popular', savings: '50% off' },
        { id: PRODUCT_IDS.REMOVE_ADS_LIFETIME, title: 'Lifetime', subtitle: 'One-time purchase, forever', price: '$49.99' },
      ];
    }

    const result: PlanOption[] = [];

    const monthly = current.monthly?.product;
    if (monthly) {
      result.push({
        id: monthly.identifier,
        title: 'Monthly',
        subtitle: 'Full access, cancel anytime',
        price: monthly.priceString || '$4.99/mo',
      });
    } else {
      result.push({ id: PRODUCT_IDS.MONTHLY, title: 'Monthly', subtitle: 'Full access, month-to-month', price: '$4.99 / mo' });
    }

    const annual = current.annual?.product;
    if (annual) {
      result.push({
        id: annual.identifier,
        title: 'Annual',
        subtitle: 'Full access, best value',
        price: annual.priceString || '$29.99/yr',
        badge: 'Popular',
        savings: 'Save 50%',
      });
    } else {
      result.push({ id: PRODUCT_IDS.ANNUAL, title: 'Annual', subtitle: 'Full access, best value', price: '$29.99 / yr', badge: 'Popular', savings: '50% off' });
    }

    const lifetime = current.lifetime?.product;
    if (lifetime) {
      result.push({
        id: lifetime.identifier,
        title: 'Lifetime',
        subtitle: 'One-time purchase, forever',
        price: lifetime.priceString || '$49.99',
      });
    } else {
      result.push({ id: PRODUCT_IDS.REMOVE_ADS_LIFETIME, title: 'Lifetime', subtitle: 'One-time purchase, forever', price: '$49.99' });
    }

    return result;
  }, [offerings]);

  const handlePurchase = async (productId: string) => {
    setPurchasing(true);
    const success = await purchase(productId);
    setPurchasing(false);

    if (success) {
      Alert.alert('Welcome!', 'You now have full access to all features. Ads have been removed.');
      onClose();
    } else {
      // The RevenueCat SDK handles user cancellation silently
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);

    if (success) {
      Alert.alert('Restored!', 'Your purchases have been restored.');
      onClose();
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
    }
  };

  // If already pro, don't show the modal
  if (isPro) return null;

  const features = [
    'Remove all advertisements',
    'Full commentary access',
    'Cross-reference library (Treasury of Scripture Knowledge)',
    'All devotionals and study resources',
    'Offline reading support',
    'Support future development',
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Crown size={22} color={Colors.gold.primary} />
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Upgrade</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.heroIconWrap, { backgroundColor: Colors.gold.primary + '18' }]}>
              <Crown size={36} color={Colors.gold.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text.primary }]}>Go Premium</Text>
            <Text style={[styles.heroDesc, { color: colors.text.secondary }]}>
              Unlock the full study experience with no ads.{'\n'}Access commentaries, cross-references, and more.
            </Text>
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan, idx) => {
              const isPopular = plan.badge === 'Popular';
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: colors.bg.card, borderColor: isPopular ? Colors.gold.primary : colors.border.default },
                    isPopular && styles.planCardPopular,
                  ]}
                  activeOpacity={0.7}
                  disabled={purchasing}
                  onPress={() => handlePurchase(plan.id)}
                >
                  {isPopular && (
                    <View style={[styles.popularBadge, { backgroundColor: Colors.gold.primary }]}>
                      <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: colors.text.primary }]}>{plan.title}</Text>
                    <Text style={[styles.planSubtitle, { color: colors.text.muted }]}>{plan.subtitle}</Text>
                  </View>
                  <View style={styles.planPriceArea}>
                    {plan.originalPrice && (
                      <Text style={[styles.planOriginalPrice, { color: colors.text.muted }]}>{plan.originalPrice}</Text>
                    )}
                    <Text style={[styles.planPrice, { color: isPopular ? Colors.gold.primary : colors.text.primary }]}>
                      {plan.price}
                    </Text>
                    {plan.savings && (
                      <Text style={[styles.planSavings, { color: status.success }]}>{plan.savings}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: colors.text.primary }]}>What's included</Text>
            {features.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Check size={16} color={Colors.gold.primary} />
                <Text style={[styles.featureText, { color: colors.text.secondary }]}>{feat}</Text>
              </View>
            ))}
          </View>

          {/* Restore & Footers */}
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
            {restoring ? (
              <ActivityIndicator color={Colors.gold.primary} size="small" />
            ) : (
              <Text style={[styles.restoreText, { color: Colors.gold.primary }]}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: colors.text.muted }]}>
            Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period.
            Manage subscriptions in your App Store or Google Play account settings.
          </Text>
        </ScrollView>

        {/* Purchase loading overlay */}
        {purchasing && (
          <View style={styles.purchasingOverlay}>
            <View style={[styles.purchasingCard, { backgroundColor: colors.bg.card }]}>
              <ActivityIndicator color={Colors.gold.primary} size="large" />
              <Text style={[styles.purchasingText, { color: colors.text.primary }]}>Processing purchase...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.size.xl, fontWeight: '700' as const },
  scrollContent: { paddingBottom: Spacing.xxxl },

  hero: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: Typography.size.xxl, fontWeight: '700' as const },
  heroDesc: { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },

  plansContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardPopular: { borderWidth: 2 },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderBottomLeftRadius: Radius.md,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '700' as const, color: Colors.text.inverse, letterSpacing: 0.5 },
  planInfo: { flex: 1 },
  planTitle: { fontSize: Typography.size.base, fontWeight: '600' as const },
  planSubtitle: { fontSize: Typography.size.xs, marginTop: 2 },
  planPriceArea: { alignItems: 'flex-end', gap: 1 },
  planOriginalPrice: { fontSize: 11, textDecorationLine: 'line-through' },
  planPrice: { fontSize: Typography.size.base, fontWeight: '700' as const },
  planSavings: { fontSize: 10, fontWeight: '600' as const },

  featuresSection: { padding: Spacing.xl, gap: Spacing.md },
  featuresTitle: { fontSize: Typography.size.base, fontWeight: '600' as const, marginBottom: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureText: { fontSize: Typography.size.sm, flex: 1 },

  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.lg },
  restoreText: { fontSize: Typography.size.sm, fontWeight: '600' as const },
  footerText: { fontSize: 10, textAlign: 'center', lineHeight: 16, paddingHorizontal: Spacing.xl },

  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  purchasingCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 200,
  },
  purchasingText: { fontSize: Typography.size.sm, fontWeight: '500' as const },
});
