module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 20000,
  testPathIgnorePatterns: ['backend/', 'e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|react-native-.*|@react-navigation/.*|react-native-purchases))',
  ],
  coverageThreshold: {
    global: {
      branches: 62,
      functions: 68,
      lines: 75,
      statements: 74,
    },
  },
};
