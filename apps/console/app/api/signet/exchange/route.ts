import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../_core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await proxyFetch('/v1/exchange', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
    let json: any = {};
    try { json = await upstream.json(); } catch { /* ignore */ }
    return NextResponse.json(json, { status: upstream.status });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

