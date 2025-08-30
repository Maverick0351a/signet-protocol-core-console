import hashlib, base64, json, sys, argparse
try:
    import rfc8785  # type: ignore
except ImportError:  # pragma: no cover
    rfc8785 = None  # type: ignore
from nacl.signing import VerifyKey

def _canonicalize(obj):
    if rfc8785 is not None:
        if hasattr(rfc8785, 'canonicalize'):
            return rfc8785.canonicalize(obj)  # type: ignore[attr-defined]
        if hasattr(rfc8785, 'dumps'):
            return rfc8785.dumps(obj)  # type: ignore[attr-defined]
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

def compute_cid_jcs(obj) -> str:
    c = _canonicalize(obj)
    if isinstance(c, str):
        c = c.encode()
    h = hashlib.sha256(c).hexdigest()
    return "sha256:" + h

def _b64u_decode(s: str) -> bytes:
    s += "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s.encode())

def verify_ed25519(message: bytes, signature_b64u: str, x_b64u: str) -> bool:
    sig = _b64u_decode(signature_b64u)
    pub = _b64u_decode(x_b64u)
    vk = VerifyKey(pub)
    try:
        vk.verify(message, sig)
        return True
    except Exception:
        return False

def verify_export_bundle(bundle: dict, response_cid: str, signature_b64u: str, jwk: dict) -> bool:
    """Verify an exported chain bundle signature using JWKS JWK.

    Server signs message: f"{response_cid}|{trace_id}|{exported_at}".
    """
    try:
        trace_id = bundle["trace_id"]
        exported_at = bundle["exported_at"]
    except KeyError:
        return False
    message = f"{response_cid}|{trace_id}|{exported_at}".encode()
    x = jwk.get("x")
    if not x:
        return False
    return verify_ed25519(message, signature_b64u, x)

def verify_receipt(receipt: dict) -> bool:
    """Verify a single receipt's structural integrity and CID (if normalized present)."""
    if not isinstance(receipt, dict):
        return False
    cid = receipt.get("cid")
    if not isinstance(cid, str) or not cid.startswith("sha256:"):
        return False
    normalized = receipt.get("normalized")
    if normalized is not None:
        try:
            recomputed = compute_cid_jcs(normalized)
        except Exception:
            return False
        if recomputed != cid:
            return False
    hop = receipt.get("hop")
    if not isinstance(hop, int) or hop < 1:
        return False
    return True

def select_jwk(jwks: dict, kid: str | None) -> dict | None:
    keys = (jwks or {}).get("keys") or []
    if kid:
        for k in keys:
            if k.get("kid") == kid:
                return k
        return None
    for k in keys:
        if k.get("crv") == "Ed25519":
            return k
    return keys[0] if keys else None

def verify_export(bundle: dict, jwks: dict) -> bool:
    """High-level export verification using fields present in exported JSON plus JWKS.

    Expects bundle to optionally include: response_cid, signature, kid.
    Falls back to last chain item receipt_hash if response_cid missing.
    """
    if not isinstance(bundle, dict):
        return False
    chain = bundle.get("chain")
    if not isinstance(chain, list) or not chain:
        return False
    last = chain[-1]
    if not isinstance(last, dict):
        return False
    response_cid = bundle.get("response_cid") or last.get("receipt_hash")
    if not isinstance(response_cid, str):
        return False
    if last.get("receipt_hash") != response_cid:
        return False
    signature = bundle.get("signature")
    if not isinstance(signature, str):
        return False
    kid = bundle.get("kid")
    jwk = select_jwk(jwks, kid)
    if not jwk:
        return False
    x = jwk.get("x")
    if not isinstance(x, str):
        return False
    trace_id = bundle.get("trace_id")
    exported_at = bundle.get("exported_at")
    if not isinstance(trace_id, str) or not isinstance(exported_at, str):
        return False
    message = f"{response_cid}|{trace_id}|{exported_at}".encode()
    # Length guard for signature (Ed25519 64 bytes)
    try:
        sig_bytes = _b64u_decode(signature)
    except Exception:
        return False
    if len(sig_bytes) != 64:
        return False
    return verify_ed25519(message, signature, x)

def _cli_verify_export(argv: list[str]) -> int:
    p = argparse.ArgumentParser(prog="signet-verify export")
    p.add_argument("export_json", help="Path to export JSON file")
    p.add_argument("jwks_json", help="Path to JWKS JSON file")
    args = p.parse_args(argv)
    try:
        with open(args.export_json, "r", encoding="utf-8") as f:
            bundle = json.load(f)
        with open(args.jwks_json, "r", encoding="utf-8") as f:
            jwks = json.load(f)
    except Exception as exc:
        print(f"Error reading files: {exc}", file=sys.stderr)
        return 2
    ok = verify_export(bundle, jwks)
    if ok:
        print("VALID")
        return 0
    print("INVALID", file=sys.stderr)
    return 1

def main():  # pragma: no cover - thin dispatcher
    if len(sys.argv) >= 2 and sys.argv[1] == "verify-export":
        sys.exit(_cli_verify_export(sys.argv[2:]))
    print("Usage: python -m signet_verify verify-export <export.json> <jwks.json>", file=sys.stderr)
    sys.exit(2)

if __name__ == "__main__":  # pragma: no cover
    main()
