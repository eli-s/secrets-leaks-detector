import { GithubScanner } from '../services/github';
import { StateManager } from '../services/storage';
import { GithubOptions } from '../models/types';

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    process.exit(1);
  }

  const [owner, repo, token] = args;
  const includeNonMainBranches = args.includes('--all-branches');
  const resume = args.includes('--resume');

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

  try {
    const findings = await scanner.scanRepository();
    
    const finalstate = scanner.getScanState();
    statemanager.savestate(finalstate);
    statemanager.saveresults(findings);

    if (findings.length > 0) {
      for (const finding of findings) {
        console.log(JSON.stringify({
          commit: finding.commitSha,
          date: finding.commitDate,
          committer: finding.committer,
          file: finding.filename,
          type: finding.secretType,
          value: finding.secretValue.substring(0, 10) + '...',
          line: finding.line
        }));
      }
    }

    console.log(JSON.stringify({
      totalCommitsScanned: finalstate.totalCommitsScanned,
      findingsCount: finalstate.findingsCount,
      lastProcessedCommit: finalstate.lastProcessedCommit,
      lastProcessedDate: finalstate.lastProcessedDate
    }));
    
  } catch (error) {
    process.exit(1);
  }
}