import { NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../../../_core';

export async function GET(_req: Request, { params }: any) {
  try {
    const trace = params?.trace;
    if (!trace) return NextResponse.json({ error: 'missing trace' }, { status: 400 });
    const res = await proxyFetch(`/v1/receipts/chain/${trace}`, { cache: 'no-store' });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

