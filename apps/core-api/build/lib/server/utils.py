import hashlib, json
from rfc8785 import canonicalize

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def cid_for_json(obj) -> str:
    data = canonicalize(obj)
    return "sha256:" + sha256_hex(data)
