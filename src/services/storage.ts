import * as fs from 'fs';
import * as path from 'path';
import { ScanState, AwsSecretFinding } from '../models/types';

export class StateManager {
  private stateFile: string;
  private resultsFile: string;

  constructor(repositoryName: string) {
    const sanitizedName = repositoryName.replace(/[^a-zA-Z0-9-_]/g, '_');
    this.stateFile = path.join(process.cwd(), `.scanstate_${sanitizedName}.json`);
    this.resultsFile = path.join(process.cwd(), `.scanresults_${sanitizedName}.json`);
  }

  saveState(state: ScanState): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
    }
  }

  loadState(): ScanState | null {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
    }
    return null;
  }

  saveResults(findings: AwsSecretFinding[]): void {
    try {
      fs.writeFileSync(this.resultsFile, JSON.stringify(findings, null, 2));
    } catch (error) {
    }
  }

  loadResults(): AwsSecretFinding[] {
    try {
      if (fs.existsSync(this.resultsFile)) {
        const data = fs.readFileSync(this.resultsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
    }
    return [];
  }

  cleanup(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        fs.unlinkSync(this.stateFile);
      }
      if (fs.existsSync(this.resultsFile)) {
        fs.unlinkSync(this.resultsFile);
      }
    } catch (error) {
    }
  }
}