import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import { computeCidJcs, verifyReceipt, verifyExport, encodeB64u } from './index';

function b64u(bytes: Uint8Array): string { return encodeB64u(bytes); }

function makeKeyPair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
    jwk: { kty: 'OKP', crv: 'Ed25519', x: b64u(kp.publicKey), kid: 'test-kid-1' }
  };
}

describe('computeCidJcs', () => {
  it('computes stable CID prefix', async () => {
    const cid = await computeCidJcs({a:1,b:2});
    expect(cid.startsWith('sha256:')).toBe(true);
  });
});

describe('verifyReceipt & verifyExport', () => {
  const { publicKey, secretKey, jwk } = makeKeyPair();
  const jwks = { keys: [jwk] };

  it('verifies a normalized receipt (positive)', async () => {
    const normalized = { Document: { Echo: { foo: 'bar' } } };
    const cid = await computeCidJcs(normalized);
    const receipt = {
      receipt_hash: 'placeholder-hash',
      cid,
      hop: 1,
      trace_id: 't-1',
      ts: '2025-08-29T00:00:00Z',
      normalized
    };
    expect(await verifyReceipt(receipt, jwks, jwk.kid)).toBe(true);
  });

  it('fails verifyReceipt on CID mismatch', async () => {
    const normalized = { hello: 'world' };
    const cid = await computeCidJcs(normalized);
    const bad = { ...normalized, extra: 1 };
    const receipt = {
      receipt_hash: 'placeholder-hash',
      cid,
      hop: 1,
      trace_id: 't-1',
      ts: '2025-08-29T00:00:00Z',
      normalized: bad
    } as any;
    expect(await verifyReceipt(receipt, jwks, jwk.kid)).toBe(false);
  });

  it('verifies export bundle signature', async () => {
    const normalized = { Document: { Echo: { foo: 'bar' } } };
    const cid = await computeCidJcs(normalized);
    const receipt_hash = 'rh1';
    const bundle = {
      trace_id: 't-1',
      chain: [ { trace_id: 't-1', ts: '2025-08-29T00:00:00Z', cid, receipt_hash, hop: 1 } ],
      exported_at: '2025-08-29T00:01:00Z',
      response_cid: receipt_hash,
      kid: jwk.kid,
      signature: ''
    };
    const msg = new TextEncoder().encode(`${receipt_hash}|${bundle.trace_id}|${bundle.exported_at}`);
    const sig = nacl.sign.detached(msg, secretKey);
    bundle.signature = b64u(sig);
    expect(await verifyExport(bundle, jwks)).toBe(true);
  });

  it('fails export verify on wrong signature', async () => {
    const normalized = { Document: { Echo: { foo: 'bar' } } };
    const cid = await computeCidJcs(normalized);
    const receipt_hash = 'rh1';
    const bundle = {
      trace_id: 't-1',
      chain: [ { trace_id: 't-1', ts: '2025-08-29T00:00:00Z', cid, receipt_hash, hop: 1 } ],
      exported_at: '2025-08-29T00:01:00Z',
      response_cid: receipt_hash,
      kid: jwk.kid,
      signature: b64u(new Uint8Array(64)) // structurally valid length but invalid content
    } as any;
    expect(await verifyExport(bundle, jwks)).toBe(false);
  });

  it('fails export verify on wrong kid', async () => {
    const normalized = { Document: { Echo: { foo: 'bar' } } };
    const cid = await computeCidJcs(normalized);
    const receipt_hash = 'rh1';
    const otherKey = makeKeyPair();
    const bundle = {
      trace_id: 't-1',
      chain: [ { trace_id: 't-1', ts: '2025-08-29T00:00:00Z', cid, receipt_hash, hop: 1 } ],
      exported_at: '2025-08-29T00:01:00Z',
      response_cid: receipt_hash,
      kid: 'unknown-kid',
      signature: 'abc'
    } as any;
    expect(await verifyExport(bundle, { keys: [otherKey.jwk] })).toBe(false);
  });
});
