import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

const PIDS_FILE = path.resolve(__dirname, '.tmp', 'e2e-pids.json');

function killPid(pid: number) {
  if (pid <= 0) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch { /* ignore */ }
}

export default async function globalTeardown() {
  try {
    const data = fs.readFileSync(PIDS_FILE, 'utf8');
    const { pids } = JSON.parse(data);
    for (const pid of pids) killPid(pid);
  } catch { /* ignore */ }
}