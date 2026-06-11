// Web stub for react-native-purchases (RevenueCat)
// This module is only used when bundling for web

const Purchases = {
  configure: async () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  getOfferings: async () => ({ current: null }),
  purchaseProduct: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ entitlements: { active: {} } }),
  logOut: async () => {},
  addCustomerInfoUpdateListener: () => () => {},
};

export default Purchases;
export const { configure, getCustomerInfo, getOfferings, purchaseProduct, restorePurchases, logOut, addCustomerInfoUpdateListener } = Purchases;
export const PurchaserInfo = {};
