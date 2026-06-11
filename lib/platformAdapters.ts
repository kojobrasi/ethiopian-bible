/**
 * Platform adapters for native-only packages.
 *
 * On web, these native modules don't exist, so we provide empty stubs.
 * The subscription/ads features simply won't work on web, but the app
 * won't crash.
 */

import { Platform } from 'react-native';

export type CustomerInfo = {
  entitlements: { active: Record<string, { isActive: boolean }> };
};

export type PurchasesOfferings = {
  current: {
    monthly?: { product: { identifier: string; priceString: string } };
    annual?: { product: { identifier: string; priceString: string } };
    lifetime?: { product: { identifier: string; priceString: string } };
  } | null;
};

// Metro aliases react-native-purchases and react-native-google-mobile-ads
// to web stubs when bundling for web (via metro.config.js).
// On native, the real modules are resolved normally.

const PurchasesModule = (() => {
  try {
    return require('react-native-purchases');
  } catch {
    return null;
  }
})();
export const Purchases = PurchasesModule
  ? PurchasesModule
  : {
      configure: async () => {},
      getCustomerInfo: async (): Promise<CustomerInfo> => ({ entitlements: { active: {} } }),
      getOfferings: async (): Promise<PurchasesOfferings> => ({ current: null }),
      purchaseProduct: async (): Promise<{ customerInfo: CustomerInfo }> => ({
        customerInfo: { entitlements: { active: {} } },
      }),
      restorePurchases: async (): Promise<CustomerInfo> => ({ entitlements: { active: {} } }),
      logOut: async () => {},
      addCustomerInfoUpdateListener: () => () => {},
    };

const AdsModule = (() => {
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
})();
export const Ads = AdsModule
  ? AdsModule
  : {
      BannerAd: () => null,
      BannerAdSize: {},
      TestIds: {},
      InterstitialAd: { createForAdRequest: () => null },
      RewardedAd: { createForAdRequest: () => null },
      AdEventType: {},
    };

