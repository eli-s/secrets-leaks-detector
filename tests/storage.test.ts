import * as fs from 'fs';
import * as path from 'path';
import { StateManager } from '../src/services/storage';
import { ScanState, AwsSecretFinding } from '../src/models/types';

// Mock fs module
jest.mock('fs');
const mockedFs = jest.mocked(fs);

describe('StateManager', () => {
  let stateManager: StateManager;
  const testRepoName = 'test_repo';

  beforeEach(() => {
    stateManager = new StateManager(testRepoName);
    jest.clearAllMocks();
  });

  describe('State Management', () => {
    it('should save scan state to file', () => {
      const testState: ScanState = {
        lastProcessedCommit: 'abc123',
        lastProcessedDate: '2023-11-19T10:00:00Z',
        totalCommitsScanned: 100,
        findingsCount: 5
      };

      mockedFs.writeFileSync.mockImplementation(() => {});

      stateManager.saveState(testState);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.scanstate_test_repo.json'),
        JSON.stringify(testState, null, 2)
      );
    });

    it('should load scan state from file', () => {
      const testState: ScanState = {
        lastProcessedCommit: 'abc123',
        lastProcessedDate: '2023-11-19T10:00:00Z',
        totalCommitsScanned: 100,
        findingsCount: 5
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(testState));

      const loadedState = stateManager.loadState();

      expect(loadedState).toEqual(testState);
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).toHaveBeenCalled();
    });

    it('should return null if state file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const loadedState = stateManager.loadState();

      expect(loadedState).toBeNull();
    });

    it('should handle errors when loading state', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const loadedState = stateManager.loadState();

      expect(loadedState).toBeNull();
    });
  });

  describe('Results Management', () => {
    it('should save findings to file', () => {
      const testFindings: AwsSecretFinding[] = [
        {
          findingId: 'test123abc456def',
          commitSha: 'abc123',
          commitDate: '2023-11-19T10:00:00Z',
          committer: 'testuser',
          filename: 'test.js',
          secretType: 'AWS Access Key ID',
          secretValue: 'AKIATEST123456789012',
          line: 1,
          action: 'added',
          branchName: 'main'
        }
      ];

      mockedFs.writeFileSync.mockImplementation(() => {});

      stateManager.saveResults(testFindings);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.scanresults_test_repo.json'),
        JSON.stringify(testFindings, null, 2)
      );
    });

    it('should load findings from file', () => {
      const testFindings: AwsSecretFinding[] = [
        {
          findingId: 'test123abc456def',
          commitSha: 'abc123',
          commitDate: '2023-11-19T10:00:00Z',
          committer: 'testuser',
          filename: 'test.js',
          secretType: 'AWS Access Key ID',
          secretValue: 'AKIATEST123456789012',
          line: 1,
          action: 'added',
          branchName: 'main'
        }
      ];

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(testFindings));

      const loadedFindings = stateManager.loadResults();

      expect(loadedFindings).toEqual(testFindings);
    });

    it('should return empty array if results file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const loadedFindings = stateManager.loadResults();

      expect(loadedFindings).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('should delete state and results files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {});

      stateManager.cleanup();

      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('.scanstate_test_repo.json')
      );
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('.scanresults_test_repo.json')
      );
    });

    it('should handle errors during cleanup', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete error');
      });

      // Should not throw
      expect(() => stateManager.cleanup()).not.toThrow();
    });
  });

  describe('Repository Name Sanitization', () => {
    it('should sanitize repository names with special characters', () => {
      const specialRepoManager = new StateManager('owner/repo-name');
      
      const testState: ScanState = {
        totalCommitsScanned: 0,
        findingsCount: 0
      };

      mockedFs.writeFileSync.mockImplementation(() => {});
      
      specialRepoManager.saveState(testState);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.scanstate_owner_repo-name.json'),
        expect.any(String)
      );
    });
  });
});