import express from 'express';
import { GithubScanner } from '../services/github';
import { StateManager } from '../services/storage';
import { GithubOptions, AwsSecretFinding } from '../models/types';

const app = express();
app.use(express.json());

interface ScanRequest {
  owner: string;
  repo: string;
  token: string;
  includeNonMainBranches?: boolean;
  resume?: boolean;
  excludePaths?: string[];
}

interface ScanResponse {
  status: 'success' | 'error' | 'in_progress';
  findings?: AwsSecretFinding[];
  message?: string;
  scanState?: {
    totalCommitsScanned: number;
    findingsCount: number;
    lastProcessedCommit?: string;
    lastProcessedDate?: string;
  };
}

const activeScans = new Map<string, boolean>();

app.post('/api/scan', async (req, res) => {
  try {
    const { owner, repo, token, includeNonMainBranches = false, resume = false, excludePaths = [] }: ScanRequest = req.body;

    if (!owner || !repo || !token) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: owner, repo, token'
      } as ScanResponse);
    }

    const scanKey = `${owner}/${repo}`;
    
    if (activeScans.get(scanKey)) {
      return res.status(409).json({
        status: 'error',
        message: 'Scan already in progress for this repository'
      } as ScanResponse);
    }

    activeScans.set(scanKey, true);

    const options: GithubOptions = {
      owner,
      repo,
      token,
      includeNonMainBranches,
      excludePaths
    };

    const scanner = new GithubScanner(options);
    const stateManager = new StateManager(`${owner}_${repo}`);

    if (resume) {
      const savedState = stateManager.loadState();
      if (savedState) {
        scanner.setScanState(savedState);
      }
    }

    // Start scanning asynchronously
    scanner.scanRepository()
      .then((findings) => {
        const finalState = scanner.getScanState();
        stateManager.saveState(finalState);
        stateManager.saveResults(findings);
        activeScans.delete(scanKey);
        console.log(`Scan completed for ${scanKey}: ${findings.length} findings`);
      })
      .catch((error) => {
        console.error(`Scan failed for ${scanKey}:`, error);
        activeScans.delete(scanKey);
      });

    // Return immediately with in_progress status
    return res.json({
      status: 'in_progress',
      message: `Scan started for ${owner}/${repo}. Use /api/scan/${owner}/${repo}/status to check progress.`
    } as ScanResponse);

  } catch (error) {
    const scanKey = `${req.body.owner}/${req.body.repo}`;
    activeScans.delete(scanKey);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during scan'
    } as ScanResponse);
  }
});

app.get('/api/scan/:owner/:repo/status', (req, res) => {
  const { owner, repo } = req.params;
  const scanKey = `${owner}/${repo}`;
  const isInProgress = activeScans.get(scanKey) || false;

  const stateManager = new StateManager(`${owner}_${repo}`);
  const savedState = stateManager.loadState();
  const savedResults = stateManager.loadResults();

  return res.json({
    status: isInProgress ? 'in_progress' : 'success',
    findings: savedResults,
    scanState: savedState ? {
      totalCommitsScanned: savedState.totalCommitsScanned,
      findingsCount: savedState.findingsCount,
      lastProcessedCommit: savedState.lastProcessedCommit,
      lastProcessedDate: savedState.lastProcessedDate
    } : undefined
  } as ScanResponse);
});

app.get('/api/scan/:owner/:repo/results', (req, res) => {
  const { owner, repo } = req.params;
  const stateManager = new StateManager(`${owner}_${repo}`);
  const findings = stateManager.loadResults();
  const state = stateManager.loadState();

  return res.json({
    status: 'success',
    findings,
    scanState: state ? {
      totalCommitsScanned: state.totalCommitsScanned,
      findingsCount: state.findingsCount,
      lastProcessedCommit: state.lastProcessedCommit,
      lastProcessedDate: state.lastProcessedDate
    } : undefined
  } as ScanResponse);
});

app.delete('/api/scan/:owner/:repo', (req, res) => {
  const { owner, repo } = req.params;
  const scanKey = `${owner}/${repo}`;
  
  activeScans.delete(scanKey);
  
  const stateManager = new StateManager(`${owner}_${repo}`);
  stateManager.cleanup();

  return res.json({
    status: 'success',
    message: 'Scan data cleared'
  } as ScanResponse);
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;

export function startServer(): void {
  app.listen(port);
}

export { app };