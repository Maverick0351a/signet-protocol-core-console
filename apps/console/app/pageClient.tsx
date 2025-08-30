"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { verifyReceiptExport, computeCidJcs } from 'signet-verify-js';

export default function HomeClient() {
  const searchParams = useSearchParams();
  const searchTrace = searchParams.get('trace');
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [traceIdLookup, setTraceIdLookup] = useState("");
  const [chainBundle, setChainBundle] = useState<any | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [cidMismatches, setCidMismatches] = useState<Record<number,string>>({});
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [playPayload, setPlayPayload] = useState('{"payload_type":"openai.tooluse.invoice.v1","target_type":"invoice.iso20022.v1","payload":{"tool_calls":[{"type":"function","function":{"name":"create_invoice","arguments":"{}"}}]}}');
  const [playResp, setPlayResp] = useState<any | null>(null);
  const [playTrace, setPlayTrace] = useState<string | null>(null);
  const [playErr, setPlayErr] = useState<string | null>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [forwardUrl, setForwardUrl] = useState('https://example.org/forward-endpoint');
  const [autoIdem, setAutoIdem] = useState(true);
  const [idemKey, setIdemKey] = useState<string | null>(null);
  const [computedCid, setComputedCid] = useState<string | null>(null);
  const [normalizedDoc, setNormalizedDoc] = useState<any | null>(null);
  const [respHeaders, setRespHeaders] = useState<Record<string,string>>({});

  async function ask() {
    setLoading(true);
    setAnswer(null);
    const r = await fetch('/api/ask', { method: 'POST', body: JSON.stringify({ q: question }) });
    const j = await r.json();
    setAnswer(j.answer || 'No answer');
    setLoading(false);
  }

  useEffect(() => {
    if (searchTrace) setPlayTrace(searchTrace);
  }, [searchTrace]);

  return (
    <main className="space-y-12">
      <section className="grid gap-8">
        <h1 className="text-4xl font-bold tracking-tight">Signet Protocol</h1>
        <p className="text-neutral-300 max-w-3xl">
          The trust fabric for AI-to-AI communications — Verified Exchanges, Signed Receipts, and HEL egress control.
        </p>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" /> Ask about Signet
          </h2>
          <div className="mt-4 flex gap-2">
            <input className="flex-1 rounded-md bg-neutral-800 px-3 py-2 outline-none" placeholder="Ask how Signet can help your business..." value={question} onChange={e => setQuestion(e.target.value)} />
            <button onClick={ask} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500" disabled={loading}>Ask <ArrowRight className="h-4 w-4" /></button>
          </div>
          {answer && <div className="mt-4 text-neutral-200">{answer}</div>}
        </div>
      </section>
      <section className="grid gap-4">
        <h2 className="text-2xl font-semibold">Get started</h2>
        <ol className="list-decimal pl-6 space-y-2 text-neutral-300">
          <li>Run the Core API (apps/core-api).</li>
          <li>Configure <code>CORE_API_URL</code> in <code>.env.local</code>.</li>
          <li>Use the Exchange Playground to post your first Verified Exchange.</li>
        </ol>
      </section>
      <section className="grid gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">Exchange Playground</h2>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
          <p className="text-sm text-neutral-400">Submit a JSON body to <code>/v1/exchange</code>. Optionally forward (HEL enforced) and reuse idempotency keys.</p>
          <div className="flex flex-col md:flex-row gap-4">
            <textarea className="flex-1 h-64 rounded-md bg-neutral-800 p-3 font-mono text-xs outline-none" value={playPayload} onChange={e => setPlayPayload(e.target.value)} />
            <div className="w-full md:w-64 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={forwardEnabled} onChange={e=>setForwardEnabled(e.target.checked)} /> Forward URL</label>
              </div>
              {forwardEnabled && <input className="w-full rounded bg-neutral-800 px-2 py-1 font-mono" value={forwardUrl} onChange={e=>setForwardUrl(e.target.value)} placeholder="https://host/path" />}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={autoIdem} onChange={e=>{setAutoIdem(e.target.checked); if (!e.target.checked) setIdemKey(null);}} /> Auto Idempotency</label>
                {idemKey && <button className="underline" onClick={()=>{setIdemKey(crypto.randomUUID());}}>Rotate</button>}
              </div>
              {!autoIdem && <input className="w-full rounded bg-neutral-800 px-2 py-1 font-mono" placeholder="custom-key" value={idemKey ?? ''} onChange={e=>setIdemKey(e.target.value || null)} />}
              {autoIdem && <div className="font-mono break-all text-[10px] text-neutral-400">{idemKey || '(auto on send)'}</div>}
              {computedCid && <div className="text-green-400 font-mono break-all">CID: {computedCid}</div>}
              {playTrace && <div className="font-mono break-all">Trace: {playTrace}</div>}
              {respHeaders['X-SIGNET-Idempotent'] === 'true' && <div className="text-amber-400">Idempotent HIT</div>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            <button onClick={async () => {
              setPlayErr(null); setPlayResp(null); setPlayTrace(null); setPlayLoading(true); setComputedCid(null); setNormalizedDoc(null); setRespHeaders({});
              try {
                // Validate JSON first for friendly error
                let bodyObj: any;
                try { bodyObj = JSON.parse(playPayload); } catch (e:any) { throw new Error('Malformed JSON: '+ e.message); }
                if (forwardEnabled) bodyObj.forward_url = forwardUrl; else delete bodyObj.forward_url;
                const headers: Record<string,string> = { 'content-type': 'application/json' };
                if (autoIdem) {
                  const key = idemKey || crypto.randomUUID();
                  setIdemKey(key);
                  headers['X-SIGNET-Idempotency-Key'] = key;
                } else if (idemKey) headers['X-SIGNET-Idempotency-Key'] = idemKey;
                const r = await fetch('/api/signet/exchange', { method: 'POST', body: JSON.stringify(bodyObj), headers });
                const headerMap: Record<string,string> = {};
                r.headers.forEach((v,k)=> headerMap[k] = v);
                setRespHeaders(headerMap);
                const j = await r.json();
                if (!r.ok) throw new Error(j.detail || j.error || `HTTP ${r.status}`);
                setPlayResp(j); setPlayTrace(j.trace_id);
                setNormalizedDoc(j.normalized);
                try { const cid = await computeCidJcs(j.normalized); setComputedCid(cid);} catch {/* ignore */}
              } catch (e:any) { setPlayErr(e.message); } finally { setPlayLoading(false); }
            }} disabled={playLoading} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500 disabled:opacity-50">{playLoading ? 'Running...' : 'Run Exchange'} <ArrowRight className="h-4 w-4" /></button>
            {playTrace && <>
              <span data-testid="trace-id" className="px-2 py-2 text-xs font-mono bg-neutral-800 rounded border border-neutral-700">{playTrace}</span>
              <button onClick={() => { setTraceIdLookup(playTrace); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex items-center gap-2 rounded-md bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600">Chain Viewer</button>
            </>}
          </div>
          {playErr && <div className="text-red-400 text-sm border border-red-700 rounded p-2 bg-red-950/20">{playErr}</div>}
          {normalizedDoc && <details open className="rounded bg-neutral-900 p-3"><summary className="cursor-pointer text-sm">Normalized Document</summary><pre className="mt-2 max-h-40 overflow-auto text-xs">{JSON.stringify(normalizedDoc, null, 2)}</pre></details>}
          {playResp && <details className="rounded bg-neutral-900 p-3"><summary className="cursor-pointer text-sm">Full Response</summary><pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-800 p-3 text-xs">{JSON.stringify(playResp, null, 2)}</pre></details>}
          {Object.keys(respHeaders).length>0 && <details className="rounded bg-neutral-900 p-3"><summary className="cursor-pointer text-sm">Response Headers</summary><pre className="mt-2 max-h-48 overflow-auto text-[10px]">{Object.entries(respHeaders).map(([k,v])=>k+': '+v).join('\n')}</pre></details>}
        </div>
      </section>
      <section className="grid gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">Chain Viewer</h2>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
          <div className="flex gap-2">
            <input className="flex-1 rounded-md bg-neutral-800 px-3 py-2 outline-none" placeholder="Enter trace_id from an exchange response" value={traceIdLookup} onChange={e => setTraceIdLookup(e.target.value)} />
            <button onClick={async () => {
              setVerifyErr(null); setVerified(null); setChainBundle(null); setCidMismatches({});
              try {
                const exportRes = await fetch(`/api/signet/receipts/export/${traceIdLookup}`);
                if (!exportRes.ok) throw new Error(`Export failed ${exportRes.status}`);
                const responseCid = exportRes.headers.get('X-SIGNET-Response-CID') || '';
                const sig = exportRes.headers.get('X-SIGNET-Signature') || '';
                const kid = exportRes.headers.get('X-SIGNET-KID') || '';
                const bundle = await exportRes.json();
                const mismatches: Record<number,string> = {};
                for (const rec of bundle.chain) {
                  try {
                    const norm = rec.normalized ?? { Document: { Echo: rec.payload ?? {} } };
                    const recomputed = await computeCidJcs(norm);
                    if (recomputed !== rec.cid) mismatches[rec.hop] = recomputed;
                  } catch (e:any) { mismatches[rec.hop] = `error:${e.message}`; }
                }
                setCidMismatches(mismatches); setChainBundle(bundle);
                const jwksRes = await fetch('/.well-known/jwks.json');
                const jw = await jwksRes.json();
                const jwk = jw.keys.find((k:any) => k.kid === kid) || jw.keys[0];
                const ok = verifyReceiptExport(bundle, responseCid, sig, jwk);
                setVerified(ok && Object.keys(mismatches).length === 0);
              } catch (e:any) { setVerifyErr(e.message); }
            }} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500" disabled={!traceIdLookup}>Load</button>
          </div>
          {verified !== null && <div data-testid="chain-status" className={`flex items-center gap-2 ${verified ? 'text-green-400' : 'text-red-400'}`}>{verified ? <><CheckCircle2 className="h-5 w-5" /><span>All hops verified</span></> : <><XCircle className="h-5 w-5" /><span>Verification failed or mismatch</span></>}</div>}
          {verifyErr && <div className="text-red-400 text-sm">{verifyErr}</div>}
          {chainBundle && <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {chainBundle.chain.map((rec:any) => {
                const mismatch = cidMismatches[rec.hop];
                return <div data-testid={`hop-${rec.hop}`} key={rec.hop} className="flex items-center justify-between rounded border border-neutral-700 px-3 py-2 text-xs bg-neutral-800">
                  <div className="flex flex-col">
                    <span className="font-mono">hop {rec.hop}</span>
                    <span className="text-neutral-400 truncate max-w-[40ch]">cid: {rec.cid}</span>
                    {mismatch && <span className="text-amber-400">recomputed: {mismatch}</span>}
                  </div>
                  <div data-testid={`hop-${rec.hop}-status`} className={mismatch ? 'text-red-400' : 'text-green-400'}>{mismatch ? 'Mismatch' : 'Verified'}</div>
                </div>;
              })}
            </div>
            <details className="rounded bg-neutral-900 p-3">
              <summary className="cursor-pointer text-sm">Raw bundle</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-800 p-3 text-xs">{JSON.stringify(chainBundle, null, 2)}</pre>
            </details>
          </div>}
        </div>
      </section>
    </main>
  );
}
