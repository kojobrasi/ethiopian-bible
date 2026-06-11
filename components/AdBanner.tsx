/**
 * AdBanner — shows a Google AdMob banner ad.
 * 
 * Automatically hides when the user has an active subscription (isPro).
 * Uses a minimal banner size that adapts to the device width.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ads } from '@/lib/platformAdapters';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getBannerAdUnitId } from '@/config/ads';
import { Colors, Spacing } from '@/constants/theme';

const BannerAd = Ads.BannerAd;
const BannerAdSize = Ads.BannerAdSize;

type AdBannerProps = {
  /** Where the ad appears — changes the styling slightly */
  placement?: 'bottom' | 'inline' | 'header';
};

export default function AdBanner({ placement = 'bottom' }: AdBannerProps) {
  const { isPro } = useSubscription();
  const [loaded, setLoaded] = useState(false);

  // If pro, render nothing
  if (isPro) return null;

  // Web doesn't support native ads
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.bottomContainer, { paddingVertical: 8, backgroundColor: Colors.bg.card }]}>
        <Text style={{ fontSize: 10, color: Colors.text.muted }}>Ad</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, placement === 'bottom' && styles.bottomContainer]}>
      {__DEV__ && (
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>AD</Text>
        </View>
      )}
      <BannerAd
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        unitId={getBannerAdUnitId()}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={(error) => {
          if (__DEV__) console.warn('[AdMob] Failed:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  devBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.gold.primary + '99',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    zIndex: 10,
  },
  devBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },
});

