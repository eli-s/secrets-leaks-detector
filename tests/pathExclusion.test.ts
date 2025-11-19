import { GithubScanner } from '../src/services/github';

// Create a test class to expose the private method for testing
class TestableGithubScanner extends GithubScanner {
  public testIsPathExcluded(filePath: string): boolean {
    return (this as any).isPathExcluded(filePath);
  }
}

describe('Path Exclusion Logic', () => {
  let scanner: TestableGithubScanner;

  beforeEach(() => {
    scanner = new TestableGithubScanner({
      owner: 'test',
      repo: 'test', 
      token: 'test',
      excludePaths: [
        '**/test/**',
        '**/tests/**',
        '**/*.test.js',
        '**/*.spec.ts',
        'node_modules/**',
        'dist/**',
        '.git/**'
      ]
    });
  });

  it('should exclude test directories', () => {
    expect(scanner.testIsPathExcluded('src/test/config.js')).toBe(true);
    expect(scanner.testIsPathExcluded('tests/unit/scanner.test.js')).toBe(true);
    expect(scanner.testIsPathExcluded('app/tests/integration/api.spec.ts')).toBe(true);
  });

  it('should exclude test files by extension', () => {
    expect(scanner.testIsPathExcluded('src/utils/helper.test.js')).toBe(true);
    expect(scanner.testIsPathExcluded('components/Button.spec.ts')).toBe(true);
  });

  it('should exclude node_modules and build directories', () => {
    expect(scanner.testIsPathExcluded('node_modules/package/index.js')).toBe(true);
    expect(scanner.testIsPathExcluded('dist/bundle.js')).toBe(true);
    expect(scanner.testIsPathExcluded('.git/config')).toBe(true);
  });

  it('should not exclude regular source files', () => {
    expect(scanner.testIsPathExcluded('src/utils/helper.js')).toBe(false);
    expect(scanner.testIsPathExcluded('src/services/github.ts')).toBe(false);
    expect(scanner.testIsPathExcluded('config/database.js')).toBe(false);
  });

  it('should handle empty exclude paths', () => {
    const scannerNoExcludes = new TestableGithubScanner({
      owner: 'test',
      repo: 'test',
      token: 'test'
    });

    expect(scannerNoExcludes.testIsPathExcluded('tests/config.js')).toBe(false);
    expect(scannerNoExcludes.testIsPathExcluded('anything.test.js')).toBe(false);
  });

  it('should handle complex glob patterns', () => {
    const complexScanner = new TestableGithubScanner({
      owner: 'test',
      repo: 'test',
      token: 'test',
      excludePaths: [
        'src/test*.js',      // Matches src/test123.js but not src/testing/file.js
        '**/mock*/**',       // Matches any directory starting with 'mock'
        '**/__tests__/**'    // Matches Jest test convention
      ]
    });

    expect(complexScanner.testIsPathExcluded('src/test123.js')).toBe(true);
    expect(complexScanner.testIsPathExcluded('src/testing/file.js')).toBe(false);
    expect(complexScanner.testIsPathExcluded('app/mocks/data.js')).toBe(true);
    expect(complexScanner.testIsPathExcluded('src/__tests__/utils.test.js')).toBe(true);
  });
});