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

const activescans = new Map<string, boolean>();

app.post('/api/scan', async (req, res) => {
  try {
    const { owner, repo, token, includeNonMainBranches = false, resume = false }: ScanRequest = req.body;

    if (!owner || !repo || !token) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: owner, repo, token'
      } as ScanResponse);
    }

    const scankey = `${owner}/${repo}`;
    
    if (activescans.get(scankey)) {
      return res.status(409).json({
        status: 'error',
        message: 'Scan already in progress for this repository'
      } as ScanResponse);
    }

    activescans.set(scankey, true);

    const options: GithubOptions = {
      owner,
      repo,
      token,
      includeNonMainBranches
    };

    const scanner = new GithubScanner(options);
    const statemanager = new StateManager(`${owner}_${repo}`);

    if (resume) {
      const savedstate = statemanager.loadstate();
      if (savedstate) {
        scanner.setScanState(savedstate);
      }
    }

    const findings = await scanner.scanRepository();
    
    const finalstate = scanner.getScanState();
    statemanager.savestate(finalstate);
    statemanager.saveresults(findings);

    activescans.delete(scankey);

    return res.json({
      status: 'success',
      findings,
      scanState: {
        totalCommitsScanned: finalstate.totalCommitsScanned,
        findingsCount: finalstate.findingsCount,
        lastProcessedCommit: finalstate.lastProcessedCommit,
        lastProcessedDate: finalstate.lastProcessedDate
      }
    } as ScanResponse);

  } catch (error) {
    const scankey = `${req.body.owner}/${req.body.repo}`;
    activescans.delete(scankey);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during scan'
    } as ScanResponse);
  }
});

app.get('/api/scan/:owner/:repo/status', (req, res) => {
  const { owner, repo } = req.params;
  const scankey = `${owner}/${repo}`;
  const isinprogress = activescans.get(scankey) || false;

  const statemanager = new StateManager(`${owner}_${repo}`);
  const savedstate = statemanager.loadstate();
  const savedresults = statemanager.loadresults();

  return res.json({
    status: isinprogress ? 'in_progress' : 'success',
    findings: savedresults,
    scanState: savedstate ? {
      totalCommitsScanned: savedstate.totalCommitsScanned,
      findingsCount: savedstate.findingsCount,
      lastProcessedCommit: savedstate.lastProcessedCommit,
      lastProcessedDate: savedstate.lastProcessedDate
    } : undefined
  } as ScanResponse);
});

app.get('/api/scan/:owner/:repo/results', (req, res) => {
  const { owner, repo } = req.params;
  const statemanager = new StateManager(`${owner}_${repo}`);
  const findings = statemanager.loadresults();
  const state = statemanager.loadstate();

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
  const scankey = `${owner}/${repo}`;
  
  activescans.delete(scankey);
  
  const statemanager = new StateManager(`${owner}_${repo}`);
  statemanager.cleanup();

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