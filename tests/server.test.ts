import request from 'supertest';
import { app } from '../src/controllers/server';

// Mock the GithubScanner
jest.mock('../src/services/github', () => ({
  GithubScanner: jest.fn().mockImplementation(() => ({
    setScanState: jest.fn(),
    scanRepository: jest.fn().mockResolvedValue([
      {
        commitSha: 'test123',
        commitDate: '2023-11-19T10:00:00Z',
        committer: 'testuser',
        filename: 'test.js',
        secretType: 'AWS Access Key ID',
        line: 1,
        action: 'added',
        branchName: 'main',
        findingId: 'abc123def4567890'
      }
    ]),
    getScanState: jest.fn().mockReturnValue({
      totalCommitsScanned: 10,
      findingsCount: 1,
      lastProcessedCommit: 'test123',
      lastProcessedDate: '2023-11-19T10:00:00Z'
    })
  }))
}));

// Mock StateManager
jest.mock('../src/services/storage', () => ({
  StateManager: jest.fn().mockImplementation(() => ({
    loadState: jest.fn().mockReturnValue(null),
    saveState: jest.fn(),
    saveResults: jest.fn(),
    loadResults: jest.fn().mockReturnValue([]),
    cleanup: jest.fn()
  }))
}));

describe('Server API', () => {
  describe('POST /api/scan', () => {
    it('should start a scan and return in_progress status', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner',
          repo: 'testrepo',
          token: 'testtoken'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
      expect(response.body.message).toContain('Scan started');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner'
          // Missing repo and token
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return error if scan already in progress', async () => {
      // Mock a slower scan to test conflict detection
      const mockSlowScan = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      
      const { GithubScanner } = require('../src/services/github');
      GithubScanner.mockImplementation(() => ({
        setScanState: jest.fn(),
        scanRepository: mockSlowScan,
        getScanState: jest.fn().mockReturnValue({
          totalCommitsScanned: 10,
          findingsCount: 0
        })
      }));

      // Start first scan
      const firstResponse = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner5',
          repo: 'testrepo5',
          token: 'testtoken'
        });
      expect(firstResponse.status).toBe(200);

      // Try to start second scan immediately (should conflict)
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner5',
          repo: 'testrepo5',
          token: 'testtoken'
        });

      expect(response.status).toBe(409);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already in progress');
    });

    it('should handle resume parameter', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner2',
          repo: 'testrepo2',
          token: 'testtoken',
          resume: true
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
    });

    it('should handle includeNonMainBranches parameter', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner3',
          repo: 'testrepo3',
          token: 'testtoken',
          includeNonMainBranches: true
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
    });

    it('should handle excludePaths parameter', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({
          owner: 'testowner4',
          repo: 'testrepo4',
          token: 'testtoken',
          excludePaths: ['**/test/**', '**/tests/**', '**/*.test.js']
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
    });
  });

  describe('GET /api/scan/:owner/:repo/status', () => {
    it('should return scan status', async () => {
      const response = await request(app)
        .get('/api/scan/testowner/testrepo/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('findings');
    });
  });

  describe('GET /api/scan/:owner/:repo/results', () => {
    it('should return scan results', async () => {
      const response = await request(app)
        .get('/api/scan/testowner/testrepo/results');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('findings');
    });
  });

  describe('DELETE /api/scan/:owner/:repo', () => {
    it('should clear scan data', async () => {
      const response = await request(app)
        .delete('/api/scan/testowner/testrepo');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('cleared');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown');

      expect(response.status).toBe(404);
    });
  });
});