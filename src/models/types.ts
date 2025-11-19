export interface AwsSecretFinding {
  commitSha: string;
  commitDate: string;
  committer: string;
  filename: string;
  secretType: string;
  secretValue: string;
  line: number;
  action: 'added' | 'removed' | 'context';
}

export interface ScanState {
  lastProcessedCommit?: string;
  lastProcessedDate?: string;
  totalCommitsScanned: number;
  findingsCount: number;
}

export interface GithubOptions {
  owner: string;
  repo: string;
  token: string;
  includeNonMainBranches?: boolean;
}

export interface AwsSecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}