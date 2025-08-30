import { describe, it, expect } from 'vitest';
import { computeCidJcs, verifyEd25519, selectJwk, verifyReceiptExport } from '../src/index';
import nacl from 'tweetnacl';

function b64u(bytes: Uint8Array) {
  const buf = Buffer.from(bytes);
  return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

describe('hashing', () => {
  it('stable CID for reordered object', async () => {
    const a = await computeCidJcs({a:1,b:2});
    const b = await computeCidJcs({b:2,a:1});
    expect(a).toBe(b);
    expect(a.startsWith('sha256:')).toBe(true);
  });
});

describe('ed25519 verify', () => {
  it('verifies a valid signature', () => {
    const kp = nacl.sign.keyPair();
    const msg = new TextEncoder().encode('hello');
    const sig = nacl.sign.detached(msg, kp.secretKey);
    const ok = verifyEd25519(msg, b64u(sig), b64u(kp.publicKey));
    expect(ok).toBe(true);
  });
});

describe('selectJwk', () => {
  it('selects by kid', () => {
    const jwks = { keys: [ {kty:'OKP', crv:'Ed25519', x:'A', kid:'k1'}, {kty:'OKP', crv:'Ed25519', x:'B', kid:'k2'} ] };
    expect(selectJwk(jwks,'k2')?.x).toBe('B');
  });
  it('falls back to first Ed25519', () => {
    const jwks = { keys: [ {kty:'OKP', crv:'Ed25519', x:'X'} ] };
    expect(selectJwk(jwks)?.x).toBe('X');
  });
});

describe('verifyReceiptExport', () => {
  it('fails if last receipt hash mismatch', () => {
    const bundle = { trace_id:'t', exported_at:'2024-01-01T00:00:00Z', chain:[{trace_id:'t', ts:'t', cid:'sha256:1', receipt_hash:'h1', hop:1}] } as any;
    const jwk = {kty:'OKP', crv:'Ed25519', x:'A'};
    const ok = verifyReceiptExport(bundle, 'different', 'sig', jwk);
    expect(ok).toBe(false);
  });
});
