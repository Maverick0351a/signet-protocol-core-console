import { NextResponse } from 'next/server';
import { proxyFetch, coreErrorResponse } from '../../../_core';

// Note: Keep the context param loose to satisfy Next.js RouteContext typing transforms.
// We defensively handle both direct object and promised params shapes.
export async function GET(_req: Request, ctx: any) {
  try {
    const rawParams = ctx?.params;
    const params = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const trace: string | undefined = params?.trace;
    if (!trace) return NextResponse.json({ error: 'missing trace' }, { status: 400 });
    const upstream = await proxyFetch(`/v1/receipts/export/${trace}`, { cache: 'no-store' });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        'X-ODIN-Response-CID': upstream.headers.get('X-ODIN-Response-CID') || '',
        'X-ODIN-Signature': upstream.headers.get('X-ODIN-Signature') || '',
        'X-ODIN-KID': upstream.headers.get('X-ODIN-KID') || '',
      }
    });
  } catch (e) {
    return coreErrorResponse(e);
  }
}

