import { NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../../_core';

export async function GET() {
  try {
    const res = await proxyFetch('/v1/compliance/dashboard', { cache: 'no-store' });
    const body = await res.text();
    return new NextResponse(body, { status: res.status, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

