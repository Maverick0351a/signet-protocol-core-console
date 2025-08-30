"use client";
import { useEffect, useState } from 'react';
import { parsePromText, summarizeMetrics } from '../../lib/prom';

interface MetricsSummary {
  exchangesOk: number; exchangesDenied: number; exchangesError: number; forwarded: number; deniedReasons: Record<string,number>; p95: number;
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [health, setHealth] = useState<'up' | 'down' | 'degraded' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      // Fetch metrics & health in parallel; metrics may fail independently.
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/signet/metrics', { cache: 'no-store' }).catch(e=>e),
        fetch('/api/signet/healthz', { cache: 'no-store' }).catch(e=>e)
      ]);
      if (healthRes instanceof Response && healthRes.ok) {
        const hj = await healthRes.json().catch(()=>null);
        setHealth(hj?.ok ? 'up' : 'degraded');
      } else if (healthRes instanceof Response) {
        setHealth('down');
      } else {
        setHealth('unknown');
      }
      if (metricsRes instanceof Response && metricsRes.ok) {
        const text = await metricsRes.text();
        const samples = parsePromText(text);
        setData(summarizeMetrics(samples));
      } else {
        setError('Metrics unavailable');
      }
    } catch (e:any) {
      setError(e.message || 'Failed loading metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Metrics & Status</h1>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="text-xs px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card label="Exchanges OK" value={data?.exchangesOk} loading={loading} />
        <Card label="Denied" value={data?.exchangesDenied} loading={loading} />
        <Card label="Errors" value={data?.exchangesError} loading={loading} />
        <Card label="Forwarded" value={data?.forwarded} loading={loading} />
        <StatusTile health={health} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold">Denied Reasons</h2>
          {!data && !loading && <div className="text-sm text-neutral-500">No data</div>}
          {data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-700">
                  <th className="py-1 pr-4">Reason</th>
                  <th className="py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.deniedReasons).sort((a,b)=>b[1]-a[1]).map(([reason,count]) => (
                  <tr key={reason} className="border-b border-neutral-800">
                    <td className="py-1 pr-4 font-mono text-xs">{reason}</td>
                    <td className="py-1">{count}</td>
                  </tr>
                ))}
                {Object.keys(data.deniedReasons).length === 0 && (
                  <tr><td colSpan={2} className="py-2 text-neutral-500 text-xs">None recorded</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Latency</h2>
            {data && <div className="text-sm">p95: <span data-testid="p95" className="font-mono">{data.p95 ? data.p95.toFixed(3) + 's' : 'n/a'}</span></div>}
            {!data && loading && <div className="text-sm text-neutral-500">Loading…</div>}
            {error && <div className="text-sm text-red-400" data-testid="metrics-error">{error}</div>}
            <p className="text-xs text-neutral-500">Computed from Prometheus histogram buckets.</p>
        </div>
      </div>
      <p className="text-xs text-neutral-600">Metrics & health fetched via console proxy. Errors are non-blocking.</p>
    </main>
  );
}

function Card({ label, value, loading }: { label: string; value: number | undefined; loading: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{loading && value===undefined ? '…' : (value ?? 0)}</div>
    </div>
  );
}

function StatusTile({ health }: { health: string }) {
  let color = 'text-neutral-400';
  let label = 'Unknown';
  if (health === 'up') { color = 'text-green-400'; label = 'Up'; }
  else if (health === 'degraded') { color = 'text-amber-400'; label = 'Degraded'; }
  else if (health === 'down') { color = 'text-red-400'; label = 'Down'; }
  return (
    <div className="rounded-lg border border-neutral-700 p-4 bg-neutral-800 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-neutral-400">Health</div>
      <div className={`text-2xl font-bold ${color}`}>{label}</div>
    </div>
  );
}
