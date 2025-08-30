import { NextResponse } from 'next/server';

export function requireCore(): string {
  const base = process.env.CORE_API_URL;
  if (!base) throw new Error('CORE_API_URL not set');
  return base;
}

export async function proxyFetch(path: string, init?: RequestInit) {
  const core = requireCore();
  return fetch(`${core}${path}`, init);
}

export function coreErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : 'internal error';
  const status = msg.includes('CORE_API_URL not set') ? 500 : 502;
  return NextResponse.json({ error: msg }, { status });
}
