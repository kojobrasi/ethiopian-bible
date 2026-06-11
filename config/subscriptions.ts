/**
 * RevenueCat / Subscription configuration.
 *
 * IMPORTANT: Replace the placeholder API keys with your actual RevenueCat
 * keys before building for production.
 *
 * How to set up:
 *   1. Create a RevenueCat account at https://app.revenuecat.com
 *   2. Create your projects for iOS and Android
 *   3. Configure your products/entitlements in RevenueCat dashboard
 *   4. Copy the API keys here (use environment variables in production)
 */

// ─── RevenueCat API Keys ──────────────────────────────────────────────────────

const RC_KEYS = {
  ios: 'YOUR_REVENUECAT_IOS_API_KEY',
  android: 'YOUR_REVENUECAT_ANDROID_API_KEY',
};

// ─── Entitlements ─────────────────────────────────────────────────────────────

export const ENTITLEMENTS = {
  /** Full access to all app features (no ads, all content) */
  PRO: 'pro',
  /** Access to commentary and cross-reference features */
  STUDY_PACK: 'study_pack',
} as const;

// ─── Offerings / Product Identifiers ──────────────────────────────────────────

export const PRODUCT_IDS = {
  /** Monthly subscription — removes ads, unlocks all features */
  MONTHLY: 'ethiopian_bible_monthly',
  /** Annual subscription — removes ads, unlocks all features (discounted) */
  ANNUAL: 'ethiopian_bible_annual',
  /** One-time purchase — removes ads forever */
  REMOVE_ADS_LIFETIME: 'ethiopian_bible_remove_ads_lifetime',
} as const;

// ─── Exported helpers ─────────────────────────────────────────────────────────

import { Platform } from 'react-native';

export function getRevenueCatApiKey(): string {
  return RC_KEYS[Platform.OS as 'ios' | 'android'] || RC_KEYS.ios;
}

export function isPro(entitlements: Record<string, { isActive: boolean }>): boolean {
  return entitlements[ENTITLEMENTS.PRO]?.isActive === true;
}

export function hasStudyPack(entitlements: Record<string, { isActive: boolean }>): boolean {
  return entitlements[ENTITLEMENTS.STUDY_PACK]?.isActive === true;
}

export function hasFullAccess(entitlements: Record<string, { isActive: boolean }>): boolean {
  return isPro(entitlements); // Pro is the catch-all entitlement
}
