module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};
