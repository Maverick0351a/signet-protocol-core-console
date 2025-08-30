import { test, expect } from 'vitest';
import { computeCidJcs, verifyReceiptExport } from '../src';

// Minimal synthetic bundle for signature verification: we can't sign here, just structural test.

test('computeCidJcs stable hash prefix', async () => {
  const cid = await computeCidJcs({ a: 1, b: 2 });
  expect(cid.startsWith('sha256:')).toBe(true);
});

test('verifyReceiptExport structural failure on mismatched responseCid', () => {
  const bundle = { trace_id: 't', exported_at: '2024-01-01T00:00:00Z', chain: [{ trace_id: 't', ts: '2024-01-01T00:00:00Z', cid: 'sha256:abc', receipt_hash: 'h1', hop: 1 }] } as any;
  const ok = verifyReceiptExport(bundle, 'different', 'sig', { kty: 'OKP', crv: 'Ed25519', x: 'AAAA' });
  expect(ok).toBe(false);
});
