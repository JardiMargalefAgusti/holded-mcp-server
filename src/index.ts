#!/usr/bin/env node

import { runServer } from './server.js';

runServer().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
