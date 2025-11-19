// Jest setup file
// Add any global test setup here

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods if needed
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};