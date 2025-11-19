import { Octokit } from '@octokit/rest';
import { GithubOptions, AwsSecretFinding, ScanState } from '../models/types';
import { detectAwsSecrets } from '../utils/patterns';

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
      : await this.getDefaultBranches();

    for (const branch of branches) {
      try {
        const branchFindings = await this.scanBranch(branch);
        findings.push(...branchFindings);
      } catch (error: any) {
        if (error.status === 404) {
          console.log(`Branch '${branch}' not found, skipping...`);
        } else {
          console.error(`Error scanning branch '${branch}':`, error.message);
        }
        continue;
      }
    }

    return findings;
  }

  private async getAllBranches(): Promise<string[]> {
    try {
      const { data: branches } = await this.makeApiCall(() =>
        this.octokit.rest.repos.listBranches({
          owner: this.options.owner,
          repo: this.options.repo,
          per_page: 100
        })
      );
      
      return branches.map(branch => branch.name);
    } catch (error) {
      console.error('Error fetching branches, using defaults:', error);
      return await this.getDefaultBranches();
    }
  }

  private async getDefaultBranches(): Promise<string[]> {
    try {
      // First, try to get the repository's actual default branch
      const { data: repo } = await this.makeApiCall(() =>
        this.octokit.rest.repos.get({
          owner: this.options.owner,
          repo: this.options.repo
        })
      );
      
      return [repo.default_branch];
    } catch (error) {
      console.error('Error fetching repository info, trying common branch names:', error);
      // Fallback to trying common branch names
      return ['main', 'master'];
    }
  }

  private async scanBranch(branch: string): Promise<AwsSecretFinding[]> {
    const findings: AwsSecretFinding[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      try {
        const { data: commits } = await this.makeApiCall(() => 
          this.octokit.rest.repos.listCommits({
            owner: this.options.owner,
            repo: this.options.repo,
            sha: branch,
            per_page: perPage,
            page: page
          })
        );

        if (commits.length === 0) break;

        const sortedCommits = commits.sort((a, b) => 
          new Date(b.commit.committer?.date || b.commit.author?.date || '').getTime() - 
          new Date(a.commit.committer?.date || a.commit.author?.date || '').getTime()
        );

        for (const commit of sortedCommits) {
          if (this.scanState.lastProcessedCommit && 
              commit.sha === this.scanState.lastProcessedCommit) {
            return findings;
          }

          const commitFindings = await this.scanCommit(commit.sha);
          findings.push(...commitFindings);
          
          this.scanState.totalCommitsScanned++;
          this.scanState.findingsCount += commitFindings.length;
          this.scanState.lastProcessedCommit = commit.sha;
          this.scanState.lastProcessedDate = commit.commit.committer?.date || commit.commit.author?.date;

          // Small delay between commits to be respectful
          await this.delay(100);
        }

        page++;
      } catch (error) {
        console.error(`Error scanning branch ${branch}:`, error);
        break;
      }
    }

    return findings;
  }

  private async scanCommit(commitSha: string): Promise<AwsSecretFinding[]> {
    const findings: AwsSecretFinding[] = [];

    try {
      const { data: commit } = await this.makeApiCall(() => 
        this.octokit.rest.repos.getCommit({
          owner: this.options.owner,
          repo: this.options.repo,
          ref: commitSha
        })
      );

      if (!commit.files) return findings;

      for (const file of commit.files) {
        if (file.status === 'removed' || !file.patch) continue;

        const addedLines = this.extractAddedLines(file.patch);
        const secretFindings = detectAwsSecrets(addedLines.join('\n'));

        for (const secretFinding of secretFindings) {
          findings.push({
            commitSha: commitSha,
            commitDate: commit.commit.committer?.date || commit.commit.author?.date || '',
            committer: commit.commit.committer?.name || commit.commit.author?.name || 'Unknown',
            filename: file.filename || 'Unknown',
            secretType: secretFinding.pattern.name,
            secretValue: secretFinding.match,
            line: secretFinding.line
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning commit ${commitSha}:`, error);
    }

    return findings;
  }

  private async makeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const result = await apiCall();
        return result;
      } catch (error: any) {
        // Don't retry 404 errors (branch/repo not found)
        if (error.status === 404) {
          throw error;
        }

        // Check if it's a rate limit error
        if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = error.response?.headers['x-ratelimit-reset'];
          const waitTime = resetTime ? (parseInt(resetTime) * 1000 - Date.now()) : 60000;
          
          console.log(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
          await this.delay(Math.max(waitTime, 1000));
          retryCount++;
          continue;
        }

        // For other errors, use exponential backoff
        if (retryCount < maxRetries - 1) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`API call failed, retrying in ${backoffTime}ms...`);
          await this.delay(backoffTime);
          retryCount++;
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractAddedLines(patch: string): string[] {
    const lines = patch.split('\n');
    const addedLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push(line.substring(1));
      }
    }

    return addedLines;
  }

  getScanState(): ScanState {
    return { ...this.scanState };
  }

  setScanState(state: ScanState): void {
    this.scanState = { ...state };
  }
}