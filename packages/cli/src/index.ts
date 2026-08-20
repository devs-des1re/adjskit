import { ADJSKIT_CLI_VERSION } from './version.js';

const args = process.argv.slice(2);

if (args[0] === '--version' || args[0] === '-v') {
  process.stdout.write(`${ADJSKIT_CLI_VERSION}\n`);
  process.exit(0);
}

process.stdout.write('adjskit — CLI is not implemented yet (Phase 6).\n');
