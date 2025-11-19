#!/usr/bin/env node

import { runCli } from './controllers/cli';
import { startServer } from './controllers/server';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--server')) {
    startServer();
    return;
  }
  
  await runCli();
}

if (require.main === module) {
  main().catch(() => {
    process.exit(1);
  });
}