// Web stub for react-native-google-mobile-ads
// This module is only used when bundling for web

const BannerAdSize = {
  BANNER: 'BANNER',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER',
  FULL_BANNER: 'FULL_BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  WIDE_SKYSCRAPER: 'WIDE_SKYSCRAPER',
};

function NoopComponent() {
  return null;
}

export const BannerAd = NoopComponent;
export { BannerAdSize };
export const TestIds = {
  BANNER: 'test-banner',
  INTERSTITIAL: 'test-interstitial',
  REWARDED: 'test-rewarded',
  APP_OPEN: 'test-app-open',
};
export const InterstitialAd = { createForAdRequest: () => null };
export const RewardedAd = { createForAdRequest: () => null };
export const AdEventType = { LOADED: 'loaded', FAILED_TO_LOAD: 'failed', OPENED: 'opened', CLOSED: 'closed' };

export default { BannerAd, BannerAdSize, TestIds };
