/**
 * Subscription context using RevenueCat (react-native-purchases).
 *
 * Provides a global subscription state across the app so anywhere can
 * check if the user has full access (no ads, all features) or free tier.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { Purchases, type CustomerInfo, type PurchasesOfferings } from '@/lib/platformAdapters';
import { getRevenueCatApiKey, ENTITLEMENTS, PRODUCT_IDS, isPro } from '@/config/subscriptions';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'loading' | 'free' | 'active';

type SubscriptionContextValue = {
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Available offerings (products) */
  offerings: PurchasesOfferings | null;
  /** Whether the user has full access (pro) */
  isPro: boolean;
  /** Present the purchase sheet for a given product ID */
  purchase: (productId: string) => Promise<boolean>;
  /** Restore purchases from the App Store / Google Play */
  restorePurchases: () => Promise<boolean>;
  /** Log out (for User ID changes) */
  logout: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue>({
  status: 'loading',
  customerInfo: null,
  offerings: null,
  isPro: false,
  purchase: async () => false,
  restorePurchases: async () => false,
  logout: async () => {},
});

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');

  // ── Initialize RevenueCat ──
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const apiKey = getRevenueCatApiKey();

        if (Platform.OS === 'ios') {
          // RevenueCat requires the API key; the app will use StoreKit for iOS
          await Purchases.configure({ apiKey });
        } else {
          await Purchases.configure({ apiKey });
        }

        // Set up a listener for changes (e.g. purchase sync from another device)
        Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
          if (mounted) {
            setCustomerInfo(info);
          }
        });

        // Fetch current customer info
        const info = await Purchases.getCustomerInfo();
        if (mounted) setCustomerInfo(info);

        // Fetch available offerings
        const offeringsData = await Purchases.getOfferings();
        if (mounted) setOfferings(offeringsData);

        if (mounted) {
          setStatus(isPro(info.entitlements.active) ? 'active' : 'free');
        }
      } catch (err) {
        console.warn('[RevenueCat] Initialization error:', err);
        if (mounted) {
          setStatus('free'); // Treat as free on error
          setOfferings(null);
        }
      }
    }

    init();

    return () => { mounted = false; };
  }, []);

  // ── Purchase a product ──
  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const { customerInfo: updatedInfo } = await Purchases.purchaseProduct(productId);
      setCustomerInfo(updatedInfo);
      const active = isPro(updatedInfo.entitlements.active);
      setStatus(active ? 'active' : 'free');
      return active;
    } catch (err: any) {
      if (err?.userCancelled) {
        // User cancelled — not an actual error
        return false;
      }
      console.warn('[RevenueCat] Purchase failed:', err);
      return false;
    }
  }, []);

  // ── Restore purchases ──
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const active = isPro(info.entitlements.active);
      setStatus(active ? 'active' : 'free');
      return active;
    } catch (err) {
      console.warn('[RevenueCat] Restore failed:', err);
      return false;
    }
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await Purchases.logOut();
      setCustomerInfo(null);
      setStatus('free');
    } catch (err) {
      console.warn('[RevenueCat] Logout failed:', err);
    }
  }, []);

  const value: SubscriptionContextValue = {
    status,
    customerInfo,
    offerings,
    isPro: isPro(customerInfo?.entitlements?.active ?? {}),
    purchase,
    restorePurchases,
    logout,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

