import { NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../_core';

export async function GET() {
  try {
    const res = await proxyFetch('/metrics', { cache: 'no-store' });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': 'text/plain; version=0.0.4' },
    });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

