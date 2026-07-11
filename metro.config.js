// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const purchasesStub = path.resolve(__dirname, 'src/__mocks__/react-native-purchases.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-purchases') {
    return {
      filePath: purchasesStub,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: false,
      passes: 2,
      pure_funcs: [],
    },
  },
};

module.exports = config;
