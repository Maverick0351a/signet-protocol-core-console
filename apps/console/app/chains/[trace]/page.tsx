'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { verifyReceiptExport, computeCidJcs } from 'signet-verify-js';

export default function ChainTracePage() {
  const params = useParams<{ trace: string }>();
  const router = useRouter();
  const trace = params.trace;
  const [traceInput, setTraceInput] = useState<string>(trace || '');
  const [bundle, setBundle] = useState<any | null>(null);
  const [chainVerified, setChainVerified] = useState<boolean | null>(null);
  const [exportVerified, setExportVerified] = useState<boolean | null>(null);
  const [cidMismatches, setCidMismatches] = useState<Record<number,string>>({});
  const [sigMeta, setSigMeta] = useState<{responseCid:string; signature:string; kid:string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setChainVerified(null);
      setExportVerified(null);
      setBundle(null);
      setCidMismatches({});
      setSigMeta(null);
      try {
        // Fetch chain (timeline) & export (signed bundle) in parallel.
        const [chainRes, exportRes] = await Promise.all([
          fetch(`/api/signet/receipts/chain/${trace}`, { cache: 'no-store' }),
          fetch(`/api/signet/receipts/export/${trace}`, { cache: 'no-store' })
        ]);
        if (!chainRes.ok) throw new Error(`Chain fetch failed ${chainRes.status}`);
        if (!exportRes.ok) throw new Error(`Export failed ${exportRes.status}`);
        const chain = await chainRes.json();
  const responseCid = exportRes.headers.get('X-SIGNET-Response-CID') || '';
  const sig = exportRes.headers.get('X-SIGNET-Signature') || '';
  const kid = exportRes.headers.get('X-SIGNET-KID') || '';
        const b = await exportRes.json();
        // Consistency check
        if (Array.isArray(chain) && Array.isArray(b.chain) && chain.length !== b.chain.length) {
          console.warn('Chain length mismatch between endpoints');
        }
        if (cancelled) return;
        const mismatches: Record<number,string> = {};
        for (const rec of (b.chain || [])) {
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
        setSigMeta({ responseCid, signature: sig, kid });
        // Try JWKS (best-effort)
        try {
            const jwksRes = await fetch('/.well-known/jwks.json');
            if (jwksRes.ok) {
              const jw = await jwksRes.json();
              const jwk = jw.keys?.find((k: any) => k.kid === kid) || jw.keys?.[0];
              if (jwk) {
                const exportOk = verifyReceiptExport(b, responseCid, sig, jwk);
                if (!cancelled) setExportVerified(exportOk);
              }
            }
        } catch {/* ignore jwks errors */}
        if (!cancelled) {
          setChainVerified(Object.keys(mismatches).length === 0);
          if (exportVerified === null) setExportVerified(null); // may remain null if JWKS missing
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (traceInput && traceInput !== trace) {
      router.push(`/chains/${traceInput}`);
    }
  }

  function downloadExport() {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.trace_id}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">Chain Viewer</h1>
      <form onSubmit={onSubmit} className="flex gap-2 items-end flex-wrap" data-testid="trace-form">
        <label className="flex flex-col text-xs gap-1">
          <span className="uppercase tracking-wide text-neutral-400">Trace ID</span>
          <input value={traceInput} onChange={e=>setTraceInput(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 font-mono text-xs w-80" placeholder="paste trace id" />
        </label>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1 rounded">Load</button>
        {bundle && <button type="button" onClick={downloadExport} data-testid="download-export" className="flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 text-xs px-3 py-1 rounded"><Download className="h-3 w-3"/>Download export</button>}
        <span data-testid="trace-id" className="font-mono text-[10px] text-neutral-500 break-all max-w-full">{trace}</span>
      </form>
      {loading && <div className="text-sm text-neutral-400">Loading...</div>}
      {error && <div className="text-red-400 text-sm" data-testid="chain-error">{error}</div>}
      <div className="flex flex-col gap-2">
        {chainVerified !== null && (
          <div data-testid="chain-status" className={`flex items-center gap-2 ${chainVerified ? 'text-green-400' : 'text-red-400'}`}>
            {chainVerified ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span>{chainVerified ? 'All hops CID-match' : 'CID mismatch detected'}</span>
          </div>
        )}
        {sigMeta && (
          <div data-testid="export-verify-status" className={`flex items-center gap-2 ${exportVerified ? 'text-green-400' : exportVerified === false ? 'text-red-400' : 'text-neutral-400'}`}>
            {exportVerified ? <ShieldCheck className="h-5 w-5" /> : exportVerified === false ? <ShieldAlert className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            <span>{exportVerified === null ? 'Signature: JWKS unavailable' : exportVerified ? 'Export signature valid' : 'Export signature invalid'}</span>
            <span className="text-[10px] font-mono bg-neutral-800 rounded px-1 py-0.5">kid:{sigMeta.kid || 'n/a'}</span>
            <span className="text-[10px] font-mono bg-neutral-800 rounded px-1 py-0.5">respCID:{sigMeta.responseCid.slice(0,24)}…</span>
          </div>
        )}
      </div>
      {bundle && (
        <div className="space-y-4">
          <ol className="flex flex-col gap-3 relative pl-4">
            <div className="absolute left-1 top-1 bottom-1 w-px bg-neutral-700" />
            {bundle.chain.map((rec: any) => {
              const mismatch = cidMismatches[rec.hop];
              const cidShort = rec.cid?.slice(0, 20) + (rec.cid?.length > 20 ? '…' : '');
              return (
                <li data-testid={`hop-${rec.hop}`} key={rec.hop} className="relative">
                  <span className={`absolute -left-[9px] top-2 h-3 w-3 rounded-full ${mismatch ? 'bg-red-500' : 'bg-green-500'}`}/>
                  <div className="rounded border border-neutral-700 px-3 py-2 text-xs bg-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono">hop {rec.hop}</span>
                      <span data-testid={`hop-${rec.hop}-status`} className={mismatch ? 'text-red-400' : 'text-green-400'}>{mismatch ? 'Mismatch' : 'Verified'}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-neutral-400 font-mono">
                      <span>ts={rec.ts}</span>
                      <span>cid={cidShort}</span>
                      {rec.prev_receipt_hash && <span>prev={rec.prev_receipt_hash.slice(0,12)}…</span>}
                    </div>
                    {mismatch && <span className="text-amber-400 text-[10px] font-mono">recomputed: {mismatch}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          <details className="rounded bg-neutral-900 p-3">
            <summary className="cursor-pointer text-sm">Raw bundle</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-800 p-3 text-xs">{JSON.stringify(bundle, null, 2)}</pre>
          </details>
        </div>
      )}
    </main>
  );
}
