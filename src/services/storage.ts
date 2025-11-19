import * as fs from 'fs';
import * as path from 'path';
import { ScanState, AwsSecretFinding } from '../models/types';

export class StateManager {
  private statefile: string;
  private resultsfile: string;

  constructor(repositoryname: string) {
    const sanitizedname = repositoryname.replace(/[^a-zA-Z0-9-_]/g, '_');
    this.statefile = path.join(process.cwd(), `.scanstate_${sanitizedname}.json`);
    this.resultsfile = path.join(process.cwd(), `.scanresults_${sanitizedname}.json`);
  }

  savestate(state: ScanState): void {
    try {
      fs.writeFileSync(this.statefile, JSON.stringify(state, null, 2));
    } catch (error) {
    }
  }

  loadstate(): ScanState | null {
    try {
      if (fs.existsSync(this.statefile)) {
        const data = fs.readFileSync(this.statefile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
    }
    return null;
  }

  saveresults(findings: AwsSecretFinding[]): void {
    try {
      fs.writeFileSync(this.resultsfile, JSON.stringify(findings, null, 2));
    } catch (error) {
    }
  }

  loadresults(): AwsSecretFinding[] {
    try {
      if (fs.existsSync(this.resultsfile)) {
        const data = fs.readFileSync(this.resultsfile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
    }
    return [];
  }

  cleanup(): void {
    try {
      if (fs.existsSync(this.statefile)) {
        fs.unlinkSync(this.statefile);
      }
      if (fs.existsSync(this.resultsfile)) {
        fs.unlinkSync(this.resultsfile);
      }
    } catch (error) {
    }
  }
}