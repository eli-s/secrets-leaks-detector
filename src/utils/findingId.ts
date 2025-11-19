import * as crypto from 'crypto';

export function generateFindingId(branchName: string, filename: string, secretValue: string): string {
  const normalizedBranch = branchName.trim().toLowerCase();
  const normalizedFilename = filename.trim().toLowerCase();
  const normalizedSecret = secretValue.trim();
  const hashInput = `${normalizedBranch}|${normalizedFilename}|${normalizedSecret}`;
  const fullHash = crypto.createHash('sha256').update(hashInput, 'utf8').digest('hex');

  return fullHash.substring(0, 16);
}

export function isSameFinding(finding1: { branchName: string; filename: string; secretValue: string }, 
                             finding2: { branchName: string; filename: string; secretValue: string }): boolean {
  const id1 = generateFindingId(finding1.branchName, finding1.filename, finding1.secretValue);
  const id2 = generateFindingId(finding2.branchName, finding2.filename, finding2.secretValue);
  return id1 === id2;
}