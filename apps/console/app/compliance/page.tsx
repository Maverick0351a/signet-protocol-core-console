"use client";

import { useState, useEffect } from 'react';

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export default function CompliancePage() {
  const [traceId, setTraceId] = useState('');
  const [annex, setAnnex] = useState<any | null>(null);
  const [pmm, setPmm] = useState<any | null>(null);
  const [dash, setDash] = useState<any | null>(null);
  const [loadingAnnex, setLoadingAnnex] = useState(false);
  const [loadingPmm, setLoadingPmm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [demoPreview, setDemoPreview] = useState(true);

  async function loadDashboard() {
    try {
      const d = await fetchJSON('/api/signet/compliance/dashboard');
      setDash(d);
    } catch (e:any) {
      setErr(e.message);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function get(kind: 'annex4' | 'pmm') {
    if (!traceId) { setDemoPreview(true); return; }
    kind === 'annex4' ? setLoadingAnnex(true) : setLoadingPmm(true);
    setErr(null);
    try {
      const data = await fetchJSON(`/api/signet/compliance/${kind}/${traceId}`);
      if (kind === 'annex4') setAnnex(data); else setPmm(data);
      setDemoPreview(false);
    } catch (e:any) {
      setErr(e.message);
    } finally {
      kind === 'annex4' ? setLoadingAnnex(false) : setLoadingPmm(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Compliance Dashboard <span className="align-middle ml-2 px-2 py-0.5 rounded bg-neutral-700 text-[10px] uppercase tracking-wide">Demo Mode</span></h1>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          className="flex-1 rounded-md bg-neutral-800 px-3 py-2 outline-none"
          placeholder="Enter trace_id"
          value={traceId}
          onChange={e=>setTraceId(e.target.value)}
        />
        <button onClick={()=>get('annex4')} disabled={loadingAnnex} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium disabled:opacity-50">{loadingAnnex? 'Generating...' : 'Annex IV'}</button>
        <button onClick={()=>get('pmm')} disabled={loadingPmm} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium disabled:opacity-50">{loadingPmm? 'Loading...' : 'PMM'}</button>
        <button onClick={loadDashboard} className="rounded-md border border-neutral-700 px-4 py-2 text-sm">Refresh</button>
      </div>
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <section className="grid gap-4">
        {dash && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dash.status || {}).map(([k,v]) => (
              <div key={k} className="rounded-lg border p-4 flex flex-col gap-1 bg-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-400 uppercase tracking-wide">{k}</div>
                  <span className="text-[10px] rounded bg-amber-600/30 text-amber-300 px-1 py-0.5 font-mono" title="Stub implementation">stub</span>
                </div>
                <div className="text-lg font-semibold">{String(v)}</div>
                <div className="flex gap-2 pt-1">
                  <a href="#" onClick={(e)=>{e.preventDefault(); get(k as 'annex4'|'pmm');}} className="text-xs underline text-blue-400">Open</a>
                  <a href="#" onClick={(e)=>{e.preventDefault(); get(k as 'annex4'|'pmm');}} className="text-xs underline text-blue-400">PDF</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-4">
        {demoPreview && !annex && !pmm && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-neutral-500 bg-neutral-900">Enter a trace id then choose Annex IV or PMM. (Stub preview)</div>
        )}
        {annex && (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold">Annex IV Report</h2>
              <span className="text-[10px] rounded bg-amber-600/30 text-amber-300 px-1 py-0.5 font-mono">stub</span>
            </div>
            <div className="flex gap-3 mb-2">
              <button className="text-xs underline text-blue-400" onClick={()=>navigator.clipboard.writeText(JSON.stringify(annex))}>Copy JSON</button>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-all max-h-72 overflow-auto">{JSON.stringify(annex, null, 2)}</pre>
          </div>
        )}
        {pmm && (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold">PMM Report</h2>
              <span className="text-[10px] rounded bg-amber-600/30 text-amber-300 px-1 py-0.5 font-mono">stub</span>
            </div>
            <div className="flex gap-3 mb-2">
              <button className="text-xs underline text-blue-400" onClick={()=>navigator.clipboard.writeText(JSON.stringify(pmm))}>Copy JSON</button>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-all max-h-72 overflow-auto">{JSON.stringify(pmm, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
