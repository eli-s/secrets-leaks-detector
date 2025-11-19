#!/usr/bin/env node

import { startServer } from './controllers/server';

if (require.main === module) {
  console.log('Starting AWS Secret Scanner Server...');
  startServer();
  console.log('Server started on port 3000');
}