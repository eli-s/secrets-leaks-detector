import { GithubScanner } from '../src/services/github';
import { GithubOptions } from '../src/models/types';

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        get: jest.fn(),
        listBranches: jest.fn(),
        listCommits: jest.fn(),
        getCommit: jest.fn()
      }
    }
  }))
}));

describe('GithubScanner', () => {
  let scanner: GithubScanner;
  let mockOptions: GithubOptions;

  beforeEach(() => {
    mockOptions = {
      owner: 'testowner',
      repo: 'testrepo', 
      token: 'testtoken',
      includeNonMainBranches: false
    };

    scanner = new GithubScanner(mockOptions);
  });

  describe('Initialization', () => {
    it('should initialize with correct options', () => {
      expect(scanner).toBeInstanceOf(GithubScanner);
      
      const initialState = scanner.getScanState();
      expect(initialState.totalCommitsScanned).toBe(0);
      expect(initialState.findingsCount).toBe(0);
    });

    it('should set scan state correctly', () => {
      const testState = {
        lastProcessedCommit: 'abc123',
        lastProcessedDate: '2023-11-19T10:00:00Z',
        totalCommitsScanned: 50,
        findingsCount: 5
      };

      scanner.setScanState(testState);
      const currentState = scanner.getScanState();

      expect(currentState).toEqual(testState);
    });
  });

  describe('Diff Content Extraction', () => {
    it('should extract diff lines with correct actions', () => {
      const mockPatch = `@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line
 another unchanged line`;

      // Access private method for testing
      const extractDiffLines = (scanner as any).extractDiffLines;
      const diffLines = extractDiffLines(mockPatch);

      expect(diffLines).toHaveLength(4);
      expect(diffLines[0].action).toBe('context');
      expect(diffLines[0].content).toBe('unchanged line');
      expect(diffLines[1].action).toBe('removed');
      expect(diffLines[1].content).toBe('removed line');
      expect(diffLines[2].action).toBe('added');
      expect(diffLines[2].content).toBe('added line');
      expect(diffLines[3].action).toBe('context');
    });

    it('should handle empty patches', () => {
      const extractDiffLines = (scanner as any).extractDiffLines;
      const diffLines = extractDiffLines('');

      // Empty string creates one empty line
      expect(diffLines).toHaveLength(1);
      expect(diffLines[0].content).toBe('');
    });
  });

  describe('Rate Limiting', () => {
    it('should have delay method', () => {
      const delay = (scanner as any).delay;
      expect(typeof delay).toBe('function');
      
      // Test delay function returns a promise
      const delayPromise = delay(100);
      expect(delayPromise).toBeInstanceOf(Promise);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API call that throws an error
      const mockOctokit = (scanner as any).octokit;
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('API Error'));

      // Test that the method exists and handles errors
      const makeApiCall = jest.fn().mockRejectedValue(new Error('API Error'));
      (scanner as any).makeApiCall = makeApiCall;
      
      const getDefaultBranches = (scanner as any).getDefaultBranches;
      const result = await getDefaultBranches();

      // Should fallback to default branches
      expect(result).toEqual(['main', 'master']);
    });
  });
});