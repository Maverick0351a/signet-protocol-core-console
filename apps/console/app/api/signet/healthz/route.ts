import { NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../_core';

export async function GET() {
  try {
    const res = await proxyFetch('/healthz', { cache: 'no-store' });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return coreErrorResponse(e);
  }
}
