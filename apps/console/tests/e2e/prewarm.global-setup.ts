import type { FullConfig } from '@playwright/test';
import http from 'node:http';

function fetchOnce(url: string, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('prewarm timeout')), timeoutMs);
    const req = http.get(url, res => {
      res.resume();
      clearTimeout(t);
      resolve();
    });
    req.on('error', err => { clearTimeout(t); reject(err); });
  });
}

export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL as string | undefined;
  if (!base) return;
  try {
    await fetchOnce(base, 20_000);
    // Small delay to let first render compile & cache.
    await new Promise(r => setTimeout(r, 500));
    // Optionally warm a chain route 404 (ensures dynamic route handler loaded)
    await fetchOnce(base.replace(/\/$/, '') + '/chains/seed-prewarm', 5_000).catch(()=>{});
    // swallow errors, tests will proceed regardless.
  } catch {
    /* ignore */
  }
}