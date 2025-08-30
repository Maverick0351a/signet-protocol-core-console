export type MetricSample = { name: string; labels: Record<string,string>; value: number };

export function parsePromText(text: string): MetricSample[] {
  const lines = text.split('\n');
  const out: MetricSample[] = [];
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]+\})?\s+([0-9eE+\-.]+)$/);
    if (!m) continue;
    const [, name, rawLabels, rawValue] = m;
    const labels: Record<string,string> = {};
    if (rawLabels) {
      for (const kv of rawLabels.slice(1, -1).split(',')) {
        const [k, v] = kv.split('=');
        if (k && v) labels[k.trim()] = v.trim().replace(/^"|"$/g, '');
      }
    }
    const value = Number(rawValue);
    if (!Number.isNaN(value)) out.push({ name, labels, value });
  }
  return out;
}

export function summarizeMetrics(samples: MetricSample[]) {
  function sum(name: string, where?: (s: MetricSample)=>boolean) {
    return samples.filter(s => s.name === name && (!where || where(s))).reduce((a,s)=>a+s.value,0);
  }

  // Aggregate denied reasons
  const deniedReasons: Record<string, number> = {};
  for (const s of samples) {
    if (s.name === 'signet_denied_total') {
      const r = s.labels.reason || 'unknown';
      deniedReasons[r] = (deniedReasons[r] || 0) + s.value;
    }
  }

  // Compute p95 from histogram buckets (cumulative counts) for signet_exchange_total_latency_seconds
  const buckets = samples.filter(s => s.name === 'signet_exchange_total_latency_seconds_bucket');
  let p95 = 0;
  if (buckets.length) {
    // group by le label (upper bound) and sort numerically
    const byLe = buckets.map(b => ({ le: parseFloat(b.labels.le), v: b.value })).filter(b=>!Number.isNaN(b.le)).sort((a,b)=>a.le - b.le);
    const totalCountSample = samples.find(s => s.name === 'signet_exchange_total_latency_seconds_count');
    const total = totalCountSample?.value || (byLe.length ? byLe[byLe.length-1].v : 0);
    const target = total * 0.95;
    for (const b of byLe) {
      if (b.v >= target) { p95 = b.le; break; }
    }
  }

  return {
    exchangesOk: sum('signet_exchanges_total', s=>s.labels.result==='ok'),
    exchangesDenied: sum('signet_exchanges_total', s=>s.labels.result==='denied') + sum('signet_denied_total'),
    exchangesError: sum('signet_exchanges_total', s=>s.labels.result==='error'),
    forwarded: sum('signet_forward_total'),
    deniedReasons,
    p95,
  };
}
