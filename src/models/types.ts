export interface AwsSecretFinding {
  findingId: string;
  commitSha: string;
  commitDate: string;
  committer: string;
  filename: string;
  secretType: string;
  secretValue: string;
  line: number;
  action: 'added' | 'removed' | 'context';
  branchName: string;
}

export interface ScanState {
  lastProcessedCommit?: string;
  lastProcessedDate?: string;
  totalCommitsScanned: number;
  findingsCount: number;
  currentBranch?: string;
  processedBranches?: string[];
}

export interface GithubOptions {
  owner: string;
  repo: string;
  token: string;
  includeNonMainBranches?: boolean;
  excludePaths?: string[];
}

export interface AwsSecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}