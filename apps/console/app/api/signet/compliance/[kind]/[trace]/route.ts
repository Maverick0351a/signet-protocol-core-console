import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../../../_core';

export async function GET(_req: NextRequest, context: any) {
  try {
    const raw = context?.params;
    const params = raw && typeof raw.then === 'function' ? await raw : raw;
    const kind: string = params?.kind;
    const trace: string = params?.trace;
    if (!(kind === 'annex4' || kind === 'pmm')) {
      return NextResponse.json({ error: 'unsupported kind' }, { status: 400 });
    }
    if (!trace) return NextResponse.json({ error: 'missing trace' }, { status: 400 });
    const res = await proxyFetch(`/v1/compliance/${kind}/${trace}`, { cache: 'no-store' });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

