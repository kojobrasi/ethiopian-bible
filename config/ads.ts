/**
 * Google AdMob configuration.
 *
 * IMPORTANT: Replace these test/dev ad unit IDs with your real AdMob ad unit IDs
 * before publishing to the App Store / Google Play Store.
 *
 * Test IDs (safe for development):
 *   Banner: ca-app-pub-3940256099942544/6300978111
 *   Interstitial: ca-app-pub-3940256099942544/1033173712
 *   Rewarded: ca-app-pub-3940256099942544/5224354917
 *   App Open: ca-app-pub-3940256099942544/9257395921
 */

import { Platform } from 'react-native';

type AdUnitIds = {
  banner: string;
  interstitial: string;
  rewarded: string;
  appOpen: string;
};

// ─── Real Ad Unit IDs (replace before release) ────────────────────────────────

const PROD_IDS: Record<string, AdUnitIds> = {
  ios: {
    banner: 'YOUR_IOS_BANNER_AD_UNIT',
    interstitial: 'YOUR_IOS_INTERSTITIAL_AD_UNIT',
    rewarded: 'YOUR_IOS_REWARDED_AD_UNIT',
    appOpen: 'YOUR_IOS_APP_OPEN_AD_UNIT',
  },
  android: {
    banner: 'YOUR_ANDROID_BANNER_AD_UNIT',
    interstitial: 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT',
    rewarded: 'YOUR_ANDROID_REWARDED_AD_UNIT',
    appOpen: 'YOUR_ANDROID_APP_OPEN_AD_UNIT',
  },
};

// ─── Test Ad Unit IDs (safe for development) ──────────────────────────────────

const TEST_IDS: Record<string, AdUnitIds> = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
  },
};

// ─── Environment check ────────────────────────────────────────────────────────

const isDev = __DEV__;

function getPlatformKey(): string {
  return Platform.OS; // 'ios' or 'android'
}

export function getAdUnitIds(): AdUnitIds {
  const source = isDev ? TEST_IDS : PROD_IDS;
  return source[getPlatformKey()];
}

// ─── Individual accessors ─────────────────────────────────────────────────────

export function getBannerAdUnitId(): string {
  return getAdUnitIds().banner;
}

export function getInterstitialAdUnitId(): string {
  return getAdUnitIds().interstitial;
}

export function getRewardedAdUnitId(): string {
  return getAdUnitIds().rewarded;
}

export function getAppOpenAdUnitId(): string {
  return getAdUnitIds().appOpen;
}

// ─── AppOpen is NOT yet used — placeholder for future use ─────────────────────
