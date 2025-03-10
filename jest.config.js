module.exports = {
  // Setting the test environment for browser-like global variables
  testEnvironment: 'jsdom',

  // The root directory where Jest should scan for tests
  roots: ['<rootDir>/tests'],

  // File extensions Jest should look for
  moduleFileExtensions: ['js', 'json'],

  // Transform files with babel-jest
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Ignore node_modules for transforms
  transformIgnorePatterns: ['/node_modules/'],

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Collect coverage information
  collectCoverage: true,

  // Directories to include in coverage report
  collectCoverageFrom: ['src/module/**/*.js'],

  // Configure coverage report format
  coverageReporters: ['text', 'lcov'],
};
