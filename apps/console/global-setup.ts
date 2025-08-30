import { spawn, SpawnOptions } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(__dirname, '..', '..');
const CORE_API_DIR = path.resolve(ROOT, 'apps', 'core-api');
const CONSOLE_DIR = path.resolve(__dirname); // apps/console
const TMP_DIR = path.resolve(CONSOLE_DIR, '.tmp');
const PIDS_FILE = path.resolve(TMP_DIR, 'e2e-pids.json');

const CORE_API_URL = process.env.CORE_API_URL || 'http://127.0.0.1:8088';
const CONSOLE_URL = process.env.CONSOLE_URL || 'http://127.0.0.1:3100';

function waitForUrl(url: string, timeoutMs = 60_000, intervalMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const retry = () => {
        if (Date.now() > deadline) return reject(new Error(`Timeout waiting for ${url}`));
        setTimeout(attempt, intervalMs);
      };
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          res.resume();
          resolve();
        } else {
          res.resume();
          retry();
        }
      });
      req.on('error', retry);
    };
    attempt();
  });
}

async function isServiceUp(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(!!res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
  });
}

function spawnProc(cmd: string, args: string[], cwd: string, env: Record<string, string | undefined> = {}) {
  const opts: SpawnOptions = { cwd, env: { ...(process.env as any), ...env }, shell: process.platform === 'win32' };
  const child = spawn(cmd, args, opts);
  child.stdout?.on('data', (d) => process.stdout.write(`[${path.basename(cwd)}] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[${path.basename(cwd)}] ${d}`));
  return child;
}

async function startCoreApi() {
  if (await isServiceUp(`${CORE_API_URL}/healthz`)) {
    console.log('[e2e] Core API already running, will reuse.');
    return { pid: -1 } as any; // sentinel pid
  }
  const python = process.platform === 'win32' ? 'python' : 'python';
  const child = spawnProc(python, ['-m', 'server'], CORE_API_DIR);
  await waitForUrl(`${CORE_API_URL}/healthz`, 90_000, 750);
  return child;
}

async function startConsole() {
  if (await isServiceUp(`${CONSOLE_URL}`)) {
    console.log('[e2e] Console already running, will reuse. Waiting for readiness...');
    await waitForUrl(`${CONSOLE_URL}`);
    return { pid: -1 } as any;
  }
  const env: Record<string,string> = {
    PORT: '3100',
    CORE_API_URL,
    NEXT_PUBLIC_BASE_URL: CONSOLE_URL,
    NODE_ENV: 'test'
  };
  const child = spawnProc('pnpm', ['dev', '--port', '3100'], CONSOLE_DIR, env);
  await waitForUrl(`${CONSOLE_URL}`, 120_000, 1_000);
  return child;
}

function writePids(pids: number[]) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  // filter out sentinel -1 (reused services not managed here)
  const managed = pids.filter(p => p && p > 0);
  fs.writeFileSync(PIDS_FILE, JSON.stringify({ pids: managed }, null, 2));
}

export default async function globalSetup() {
  console.log('[e2e] Starting core API and console...');
  const api = await startCoreApi();
  console.log('[e2e] Core API started pid', api.pid);
  const consoleApp = await startConsole();
  console.log('[e2e] Console started pid', consoleApp.pid);
  writePids([api.pid ?? -1, consoleApp.pid ?? -1]);
  console.log('[e2e] Wrote PIDs file');
}