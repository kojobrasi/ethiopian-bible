const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On web, the native-only modules will fail to bundle.
// We alias them to empty stubs for web builds.
config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only intercept web requests for native-only packages
  if (platform === 'web') {
    if (
      moduleName === 'react-native-google-mobile-ads' ||
      moduleName.startsWith('react-native-google-mobile-ads/')
    ) {
      // Return an empty mock for web
      return {
        filePath: require.resolve('./lib/admobWebStub.js'),
        type: 'sourceFile',
      };
    }
    if (
      moduleName === 'react-native-purchases' ||
      moduleName.startsWith('react-native-purchases/')
    ) {
      return {
        filePath: require.resolve('./lib/purchasesWebStub.js'),
        type: 'sourceFile',
      };
    }
  }
  // Fall back to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
