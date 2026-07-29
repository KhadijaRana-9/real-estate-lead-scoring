module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/testEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/mongoSetup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  // Integration tests share one MongoDB test database and drop it
  // between files (see mongoSetup.js). Running workers in parallel would
  // race on that drop, so tests run serially - slower, but eliminates an
  // entire class of cross-test data races.
  maxWorkers: 1,
  testTimeout: 15000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/seed/**',
    '!src/migrations/**',
    '!src/scripts/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
};
