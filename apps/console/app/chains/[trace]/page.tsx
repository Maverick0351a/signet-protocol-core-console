'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { verifyReceiptExport, computeCidJcs } from 'signet-verify-js';

export default function ChainTracePage() {
  const params = useParams<{ trace: string }>();
  const trace = params.trace;
  const [bundle, setBundle] = useState<any | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [cidMismatches, setCidMismatches] = useState<Record<number,string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setVerified(null);
      setBundle(null);
      setCidMismatches({});
      try {
        const exportRes = await fetch(`/api/signet/receipts/export/${trace}`);
        if (!exportRes.ok) throw new Error(`Export failed ${exportRes.status}`);
        const responseCid = exportRes.headers.get('X-ODIN-Response-CID') || '';
        const sig = exportRes.headers.get('X-ODIN-Signature') || '';
        const kid = exportRes.headers.get('X-ODIN-KID') || '';
        const b = await exportRes.json();
        if (cancelled) return;
        const mismatches: Record<number,string> = {};
        for (const rec of b.chain || []) {
          try {
            // Server stores normalized already as { Document: { Echo: originalPayload } }
            const norm = rec.normalized ?? { Document: { Echo: rec.payload ?? {} } };
            const recomputed = await computeCidJcs(norm);
            if (recomputed !== rec.cid) mismatches[rec.hop] = recomputed;
          } catch (e:any) {
            mismatches[rec.hop] = `error:${e.message}`;
          }
        }
        setCidMismatches(mismatches);
        setBundle(b);
        // Try JWKS (best-effort)
        try {
            const jwksRes = await fetch('/.well-known/jwks.json');
            if (jwksRes.ok) {
              const jw = await jwksRes.json();
              const jwk = jw.keys?.find((k: any) => k.kid === kid) || jw.keys?.[0];
              if (jwk) {
                const ok = verifyReceiptExport(b, responseCid, sig, jwk);
                if (!cancelled) setVerified(ok && Object.keys(mismatches).length === 0);
              }
            }
        } catch {/* ignore jwks errors */}
        if (!cancelled && verified === null) {
          setVerified(Object.keys(mismatches).length === 0);
        }
      } catch (e:any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (trace) load();
    return () => { cancelled = true; };
  }, [trace]);

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">Chain Trace <span data-testid="trace-id" className="font-mono text-sm text-neutral-400">{trace}</span></h1>
      {loading && <div className="text-sm text-neutral-400">Loading...</div>}
      {error && <div className="text-red-400 text-sm" data-testid="chain-error">{error}</div>}
      {verified !== null && (
        <div data-testid="chain-status" className={`flex items-center gap-2 ${verified ? 'text-green-400' : 'text-red-400'}`}>
          {verified ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span>{verified ? 'All hops verified' : 'Verification failed or mismatch'}</span>
        </div>
      )}
      {bundle && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {bundle.chain.map((rec: any) => {
              const mismatch = cidMismatches[rec.hop];
              return (
                <div data-testid={`hop-${rec.hop}`} key={rec.hop} className="flex items-center justify-between rounded border border-neutral-700 px-3 py-2 text-xs bg-neutral-800">
                  <div className="flex flex-col">
                    <span className="font-mono">hop {rec.hop}</span>
                    <span className="text-neutral-400 truncate max-w-[40ch]">cid: {rec.cid}</span>
                    {mismatch && <span className="text-amber-400">recomputed: {mismatch}</span>}
                  </div>
                  <div data-testid={`hop-${rec.hop}-status`} className={mismatch ? 'text-red-400' : 'text-green-400'}>
                    {mismatch ? 'Mismatch' : 'Verified'}
                  </div>
                </div>
              );
            })}
          </div>
          <details className="rounded bg-neutral-900 p-3">
            <summary className="cursor-pointer text-sm">Raw bundle</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-800 p-3 text-xs">{JSON.stringify(bundle, null, 2)}</pre>
          </details>
        </div>
      )}
    </main>
  );
}
