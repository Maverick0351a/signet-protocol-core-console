import base64
import time
from typing import Any

from nacl.signing import SigningKey

from .settings import settings

_cached_pub: dict[str, Any] | None = None
_cached_at: float = 0.0

def get_signing_key() -> SigningKey:
    if settings.private_key_b64:
        raw = base64.urlsafe_b64decode(settings.private_key_b64 + "===")
        return SigningKey(raw)
    # Dev key (DO NOT USE IN PROD)
    return SigningKey.generate()

def current_jwk() -> dict[str, Any]:
    global _cached_pub, _cached_at
    now = time.time()
    if _cached_pub and now - _cached_at < settings.jwks_cache_ttl:
        return _cached_pub
    sk = get_signing_key()
    vk = sk.verify_key
    x = base64.urlsafe_b64encode(bytes(vk)).decode().rstrip("=")
    jwk = {"kty": "OKP", "crv": "Ed25519", "x": x, "kid": settings.kid}
    _cached_pub, _cached_at = jwk, now
    return jwk

def jwks_response() -> dict[str, Any]:
    return {"keys": [current_jwk()]}

def sign_bundle(bundle_cid: str, trace_id: str, exported_at: str) -> str:
    message = f"{bundle_cid}|{trace_id}|{exported_at}".encode()
    sig = get_signing_key().sign(message).signature
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")
