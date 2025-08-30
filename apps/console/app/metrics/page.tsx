import { parsePromText, summarizeMetrics } from '../../lib/prom';

async function getMetrics() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const res = await fetch(`${base}/api/signet/metrics`, { cache: 'no-store' });
  const text = await res.text();
  const samples = parsePromText(text);
  return summarizeMetrics(samples);
}

export default async function MetricsPage() {
  const m = await getMetrics();
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Service Metrics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Exchanges OK" value={m.exchangesOk} />
        <Card label="Denied" value={m.exchangesDenied} />
        <Card label="Errors" value={m.exchangesError} />
        <Card label="Forwarded" value={m.forwarded} />
      </div>
      <p className="text-sm text-neutral-500">Live data from Core API /metrics (proxied).</p>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
