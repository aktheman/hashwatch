module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 20000,
  testPathIgnorePatterns: ['backend/', 'e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|react-native-.*|@react-navigation/.*|react-native-purchases))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 78,
      functions: 84,
      lines: 89,
      statements: 87,
    },
  },
};
