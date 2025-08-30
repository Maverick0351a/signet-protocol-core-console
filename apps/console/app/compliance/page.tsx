"use client";

import { useState } from 'react';

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

  async function loadDashboard() {
    try {
      const d = await fetchJSON('/api/signet/compliance/dashboard');
      setDash(d);
    } catch (e:any) {
      setErr(e.message);
    }
  }

  async function get(kind: 'annex4' | 'pmm') {
    if (!traceId) return;
    kind === 'annex4' ? setLoadingAnnex(true) : setLoadingPmm(true);
    setErr(null);
    try {
      const data = await fetchJSON(`/api/signet/compliance/${kind}/${traceId}`);
      if (kind === 'annex4') setAnnex(data); else setPmm(data);
    } catch (e:any) {
      setErr(e.message);
    } finally {
      kind === 'annex4' ? setLoadingAnnex(false) : setLoadingPmm(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Compliance Dashboard</h1>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 rounded-md bg-neutral-800 px-3 py-2 outline-none"
          placeholder="Enter trace_id"
          value={traceId}
          onChange={e=>setTraceId(e.target.value)}
        />
        <button onClick={()=>get('annex4')} disabled={!traceId || loadingAnnex} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium disabled:opacity-50">{loadingAnnex? 'Generating...' : 'Generate Annex IV'}</button>
        <button onClick={()=>get('pmm')} disabled={!traceId || loadingPmm} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium disabled:opacity-50">{loadingPmm? 'Loading...' : 'Fetch PMM'}</button>
        <button onClick={loadDashboard} className="rounded-md border border-neutral-700 px-4 py-2 text-sm">Refresh Dashboard</button>
      </div>
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <section className="grid gap-4">
        {dash && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dash.status || {}).map(([k,v]) => (
              <div key={k} className="rounded-lg border p-4">
                <div className="text-sm text-neutral-500">{k}</div>
                <div className="text-xl font-semibold">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-4">
        {annex && (
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">Annex IV</h2>
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(annex, null, 2)}</pre>
          </div>
        )}
        {pmm && (
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">PMM</h2>
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(pmm, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
