module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
  maxWorkers: 1,
  testTimeout: 120000,
  verbose: false,
};
