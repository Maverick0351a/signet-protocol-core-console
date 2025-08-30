import hashlib, base64, json
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
