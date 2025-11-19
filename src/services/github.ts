import { Octokit } from '@octokit/rest';
import { GithubOptions, AwsSecretFinding, ScanState } from '../models/types';
import { detectawssecrets } from '../utils/patterns';

export class GithubScanner {
  private octokit: Octokit;
  private options: GithubOptions;
  private scanState: ScanState;

  constructor(options: GithubOptions) {
    this.options = options;
    this.octokit = new Octokit({
      auth: options.token,
    });
    this.scanState = {
      totalCommitsScanned: 0,
      findingsCount: 0
    };
  }

  async scanRepository(): Promise<AwsSecretFinding[]> {
    const findings: AwsSecretFinding[] = [];
    
    const branches = this.options.includeNonMainBranches 
      ? await this.getAllBranches() 
      : ['main', 'master'];

    for (const branch of branches) {
      try {
        const branchfindings = await this.scanBranch(branch);
        findings.push(...branchfindings);
      } catch (error) {
        continue;
      }
    }

    return findings;
  }

  private async getAllBranches(): Promise<string[]> {
    try {
      const { data: branches } = await this.octokit.rest.repos.listBranches({
        owner: this.options.owner,
        repo: this.options.repo,
        per_page: 100
      });
      
      return branches.map(branch => branch.name);
    } catch (error) {
      return ['main', 'master'];
    }
  }

  private async scanBranch(branch: string): Promise<AwsSecretFinding[]> {
    const findings: AwsSecretFinding[] = [];
    let page = 1;
    const perpage = 100;

    while (true) {
      try {
        const { data: commits } = await this.octokit.rest.repos.listCommits({
          owner: this.options.owner,
          repo: this.options.repo,
          sha: branch,
          per_page: perpage,
          page: page
        });

        if (commits.length === 0) break;

        const sortedcommits = commits.sort((a, b) => 
          new Date(b.commit.committer?.date || b.commit.author?.date || '').getTime() - 
          new Date(a.commit.committer?.date || a.commit.author?.date || '').getTime()
        );

        for (const commit of sortedcommits) {
          if (this.scanState.lastProcessedCommit && 
              commit.sha === this.scanState.lastProcessedCommit) {
            return findings;
          }

          const commitfindings = await this.scanCommit(commit.sha);
          findings.push(...commitfindings);
          
          this.scanState.totalCommitsScanned++;
          this.scanState.findingsCount += commitfindings.length;
          this.scanState.lastProcessedCommit = commit.sha;
          this.scanState.lastProcessedDate = commit.commit.committer?.date || commit.commit.author?.date;
        }

        page++;
      } catch (error) {
        break;
      }
    }

    return findings;
  }

  private async scanCommit(commitsha: string): Promise<AwsSecretFinding[]> {
    const findings: AwsSecretFinding[] = [];

    try {
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner: this.options.owner,
        repo: this.options.repo,
        ref: commitsha
      });

      if (!commit.files) return findings;

      for (const file of commit.files) {
        if (file.status === 'removed' || !file.patch) continue;

        const addedlines = this.extractAddedLines(file.patch);
        const secretfindings = detectawssecrets(addedlines.join('\n'));

        for (const secretfinding of secretfindings) {
          findings.push({
            commitSha: commitsha,
            commitDate: commit.commit.committer?.date || commit.commit.author?.date || '',
            committer: commit.commit.committer?.name || commit.commit.author?.name || 'Unknown',
            filename: file.filename || 'Unknown',
            secretType: secretfinding.pattern.name,
            secretValue: secretfinding.match,
            line: secretfinding.line
          });
        }
      }
    } catch (error) {
    }

    return findings;
  }

  private extractAddedLines(patch: string): string[] {
    const lines = patch.split('\n');
    const addedlines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedlines.push(line.substring(1));
      }
    }

    return addedlines;
  }

  getScanState(): ScanState {
    return { ...this.scanState };
  }

  setScanState(state: ScanState): void {
    this.scanState = { ...state };
  }
}