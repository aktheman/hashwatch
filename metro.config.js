// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const purchasesStub = path.resolve(__dirname, 'src/__mocks__/react-native-purchases.ts');

// Platform-specific empty stubs: replace packages that are never used
// on a given platform with empty modules to enable dead-code elimination.
const WEB_ONLY_STUB = path.resolve(__dirname, 'src/__stubs__/empty.ts');
const NATIVE_ONLY_STUB = path.resolve(__dirname, 'src/__stubs__/empty.ts');

// Packages that are only meaningful on web
const WEB_ONLY_PACKAGES = new Set([
  'react-dom',
  'react-native-web',
  'world-map-country-shapes',
]);

// Packages that are only meaningful on native
const NATIVE_ONLY_PACKAGES = new Set([
  'react-native-view-shot',
]);

config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web stubs for RevenueCat (not available on web)
  if (platform === 'web' && moduleName === 'react-native-purchases') {
    return {
      filePath: purchasesStub,
      type: 'sourceFile',
    };
  }

  // Exclude web-only packages from native builds
  if (platform !== 'web' && WEB_ONLY_PACKAGES.has(moduleName)) {
    return {
      filePath: WEB_ONLY_STUB,
      type: 'sourceFile',
    };
  }

  // Exclude native-only packages from web builds
  if (platform === 'web' && NATIVE_ONLY_PACKAGES.has(moduleName)) {
    return {
      filePath: NATIVE_ONLY_STUB,
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      // Keep console for debugging; remove in production builds via CI flag
      drop_console: false,
      // 3 passes: first merges constants, second eliminates dead code, third cleans up
      passes: 3,
      pure_funcs: [],
      // Enable dead-code elimination
      dead_code: true,
      // Drop unused variables
      unused: true,
      // Collapse single-use variables
      reduce_vars: true,
      // Merge identical expressions
      collapse_vars: true,
      // Remove unreferenced functions
      reduce_funcs: true,
      // Hoist function declarations (helps minifier spot dead code)
      hoist_funs: true,
      // Evaluate constant expressions at compile time
      evaluate: true,
      // Compress conditionals
      conditionals: true,
      // Remove empty statements
      join_vars: true,
      // Simplify boolean returns
      booleans: true,
    },
  },
};

// Serializer: group vendor modules with higher IDs so they land in a contiguous
// block of the bundle. When only app code changes the vendor chunk hash stays
// stable, improving downstream caching (CDN, OTA, hermes bytecode).
const vendorIds = new Map();
let nextVendorId = 1_000_000;

config.serializer = {
  ...config.serializer,
  createModuleIdFactory:
    config.serializer?.createModuleIdFactory ??
    (() => {
      const appIds = new Map();
      let nextAppId = 0;
      return (modulePath) => {
        if (modulePath.includes('node_modules')) {
          if (!vendorIds.has(modulePath)) vendorIds.set(modulePath, nextVendorId++);
          return vendorIds.get(modulePath);
        }
        if (!appIds.has(modulePath)) appIds.set(modulePath, nextAppId++);
        return appIds.get(modulePath);
      };
    })(),
  processModuleFilter: (module) => {
    // Keep all modules; the ID factory above groups them.
    // This hook is a convenient place for future per-module exclusions.
    return true;
  },
};

module.exports = config;
