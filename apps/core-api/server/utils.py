import hashlib
from typing import Any
import json

try:
    # Prefer canonicalize (returns bytes) else dumps (str) else our deterministic json.
    import rfc8785  # type: ignore
except ImportError:  # pragma: no cover
    rfc8785 = None  # type: ignore

def _canonicalize(obj: Any):  # type: ignore
    if rfc8785 is not None:  # type: ignore
        if hasattr(rfc8785, "canonicalize"):
            return rfc8785.canonicalize(obj)  # type: ignore[attr-defined]
        if hasattr(rfc8785, "dumps"):
            return rfc8785.dumps(obj)  # type: ignore[attr-defined]
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def cid_for_json(obj) -> str:
    data = _canonicalize(obj)
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    return "sha256:" + sha256_hex(data_bytes)
