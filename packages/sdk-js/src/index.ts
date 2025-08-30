import canonicalize from "canonicalize";
import nacl from "tweetnacl";
import { createHash } from "crypto";

async function sha256Hex(data: Uint8Array): Promise<string> {
  const globalCrypto: Crypto | undefined = (globalThis as any).crypto;
  if (globalCrypto?.subtle) {
    const digest = await globalCrypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Node fallback
  try {
    return createHash("sha256").update(Buffer.from(data)).digest("hex");
  } catch (e) {
    throw new Error("No hashing implementation available");
  }
}

export async function computeCidJcs(obj: unknown): Promise<string> {
  const c14n = canonicalize(obj);
  if (!c14n) throw new Error("canonicalization failed");
  const data = new TextEncoder().encode(c14n);
  const h = await sha256Hex(data);
  return "sha256:" + h;
}

export function verifyEd25519(message: Uint8Array, signatureB64u: string, xB64u: string): boolean {
  const sig = decodeB64u(signatureB64u);
  const pub = decodeB64u(xB64u);
  return nacl.sign.detached.verify(message, sig, pub);
}

export interface JsonWebKeyEd25519 { kty: string; crv: string; x: string; kid?: string }

export function selectJwk(jwks: { keys: JsonWebKeyEd25519[] }, kid?: string): JsonWebKeyEd25519 | undefined {
  if (!jwks?.keys?.length) return undefined;
  if (kid) return jwks.keys.find(k => k.kid === kid);
  // Fallback: first Ed25519 key
  return jwks.keys.find(k => k.crv === "Ed25519") || jwks.keys[0];
}

export function decodeB64u(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const B: any = (globalThis as any).Buffer;
  if (B) {
    const bin = B.from(b64, "base64");
    return new Uint8Array(bin);
  }
  const str = atob(b64);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

export function encodeB64u(bytes: Uint8Array): string {
  const B: any = (globalThis as any).Buffer;
  const b64 = B ? B.from(bytes).toString("base64") : btoa(String.fromCharCode(...bytes));
  return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export interface ExportedChainBundle {
  trace_id: string;
  chain: Array<{ trace_id: string; ts: string; cid: string; receipt_hash: string; prev_receipt_hash?: string; hop: number }>;
  exported_at: string;
  // Optionally include signature metadata (mirrors response headers) for convenience
  response_cid?: string;
  signature?: string; // base64url ed25519 signature of `${response_cid}|${trace_id}|${exported_at}`
  kid?: string;
}

export function verifyReceiptExport(bundle: ExportedChainBundle, responseCid: string, signatureB64u: string, jwk: { kty: string; crv: string; x: string }): boolean {
  // Minimal check: last receipt_hash equals provided responseCid
  if (bundle.chain[bundle.chain.length - 1].receipt_hash !== responseCid) return false;
  // Reconstruct signing message (mirrors server.security.sign_bundle)
  const message = new TextEncoder().encode(`${responseCid}|${bundle.trace_id}|${bundle.exported_at}`);
  return verifyEd25519(message, signatureB64u, jwk.x);
}

export async function verifyReceipt(
  receipt: { receipt_hash: string; prev_receipt_hash?: string; cid: string; hop: number; trace_id: string; ts: string; normalized?: unknown },
  jwks: { keys: JsonWebKeyEd25519[] },
  kid?: string
): Promise<boolean> {
  if (!receipt || typeof receipt !== "object") return false;
  if (typeof receipt.cid !== "string" || !receipt.cid.startsWith("sha256:")) return false;
  if (receipt.normalized !== undefined) {
    try {
      const recomputed = await computeCidJcs(receipt.normalized);
      if (recomputed !== receipt.cid) return false;
    } catch {
      return false;
    }
  }
  // Structural hop number
  if (typeof receipt.hop !== "number" || receipt.hop < 1) return false;
  // If kid provided ensure it's present in JWKS
  if (kid && !selectJwk(jwks, kid)) return false;
  // Basic format pass
  return true;
}

export async function verifyExport(
  bundle: ExportedChainBundle,
  jwks: { keys: JsonWebKeyEd25519[] }
): Promise<boolean> {
  if (!bundle.chain?.length) return false;
  const last = bundle.chain[bundle.chain.length - 1];
  const responseCid = bundle.response_cid || last.receipt_hash;
  if (last.receipt_hash !== responseCid) return false;
  const kid = bundle.kid;
  const jwk = selectJwk(jwks, kid);
  if (!jwk || jwk.crv !== "Ed25519" || !jwk.x) return false;
  if (!bundle.signature) return false;
  // Validate signature decodes and is correct size (Ed25519 = 64 bytes)
  try {
    const sigBytes = decodeB64u(bundle.signature);
    if (sigBytes.length !== 64) return false;
  } catch {
    return false;
  }
  const message = new TextEncoder().encode(`${responseCid}|${bundle.trace_id}|${bundle.exported_at}`);
  return verifyEd25519(message, bundle.signature, jwk.x);
}

// Backwards compatibility alias (older name)
export const verifyExportBundle = verifyExport;
