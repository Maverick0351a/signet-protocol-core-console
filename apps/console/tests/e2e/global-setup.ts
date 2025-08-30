import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  // Windows-friendly Python launcher
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python';
  const corePath = path.resolve(__dirname, '../../../core-api');
  const env = { ...process.env, PYTHONPATH: corePath };
  const proc = spawn(pythonCmd, ['-m', 'uvicorn', 'server.main:app', '--port', '8000'], { cwd: corePath, env, stdio: 'inherit' });
  fs.writeFileSync('.core-api-pid', String(proc.pid));
  // wait for server
  await new Promise(res => setTimeout(res, 2500));
}
