import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = resolve(__dirname, '../../core-api');

const CORE_PORT = process.env.CORE_PORT || '8088';
const PYBIN = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
const UVICORN = 'uvicorn';

const args = ['-m', UVICORN, 'server.main:app', '--host', '127.0.0.1', '--port', CORE_PORT];

console.log(`[e2e] Starting Core API: ${PYBIN} ${args.join(' ')} (cwd=${CORE_DIR})`);
const child = spawn(PYBIN, args, {
  cwd: CORE_DIR,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  console.log(`[e2e] Core API exited code=${code} signal=${signal}`);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
