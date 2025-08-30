import { describe, it, expect } from 'vitest';
import { computeCidJcs } from '../src/index';

// WebCrypto available in Node 20

describe('computeCidJcs', () => {
  it('computes deterministic cid', async () => {
    const cid1 = await computeCidJcs({ a: 1, b: 2 });
    const cid2 = await computeCidJcs({ b: 2, a: 1 });
    expect(cid1).toBe(cid2);
    expect(cid1.startsWith('sha256:')).toBe(true);
  });
});
