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
    return samples
      .filter(s => s.name === name && (!where || where(s)))
      .reduce((a,s)=>a+s.value,0);
  }
  return {
    exchangesOk: sum('signet_exchanges_total', s=>s.labels.result==='ok'),
    exchangesDenied: sum('signet_exchanges_total', s=>s.labels.result==='denied') + sum('signet_denied_total'),
    exchangesError: sum('signet_exchanges_total', s=>s.labels.result==='error'),
    forwarded: sum('signet_forward_total'),
  };
}
