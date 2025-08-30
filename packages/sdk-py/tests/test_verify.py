from signet_verify import compute_cid_jcs, verify_receipt, verify_export, verify_ed25519
from nacl.signing import SigningKey
import base64

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def test_cid():
    cid = compute_cid_jcs({"a":1})
    assert cid.startswith("sha256:")


def test_verify_receipt_positive():
    norm = {"Doc": {"Echo": {"x": 1}}}
    cid = compute_cid_jcs(norm)
    receipt = {"cid": cid, "hop": 1, "trace_id": "t", "ts": "2025-08-29T00:00:00Z", "receipt_hash": "rh1", "normalized": norm}
    assert verify_receipt(receipt)


def test_verify_receipt_bad_cid_mismatch():
    norm = {"Doc": {"Echo": {"x": 1}}}
    cid = compute_cid_jcs(norm)
    receipt = {"cid": cid, "hop": 1, "trace_id": "t", "ts": "2025-08-29T00:00:00Z", "receipt_hash": "rh1", "normalized": {"different": True}}
    assert not verify_receipt(receipt)


def test_verify_export_positive_and_negative():
    sk = SigningKey.generate()
    vk = sk.verify_key
    x = b64u(bytes(vk))
    norm = {"Doc": {"Echo": {"x": 2}}}
    cid = compute_cid_jcs(norm)
    receipt_hash = "rh-last"
    bundle = {
        "trace_id": "t",
        "chain": [{"trace_id": "t", "ts": "2025-08-29T00:00:00Z", "cid": cid, "receipt_hash": receipt_hash, "hop": 1}],
        "exported_at": "2025-08-29T00:01:00Z",
        "response_cid": receipt_hash,
        "kid": "kid-1",
    }
    msg = f"{receipt_hash}|t|2025-08-29T00:01:00Z".encode()
    sig = sk.sign(msg).signature
    bundle["signature"] = b64u(sig)
    jwks = {"keys": [{"kty": "OKP", "crv": "Ed25519", "x": x, "kid": "kid-1"}]}
    assert verify_export(bundle, jwks)
    # Wrong signature
    bundle_bad_sig = dict(bundle)
    bundle_bad_sig["signature"] = b64u(b"0" * 64)
    assert not verify_export(bundle_bad_sig, jwks)
    # Wrong JWKS (kid mismatch)
    jwks_wrong = {"keys": [{"kty": "OKP", "crv": "Ed25519", "x": x, "kid": "other"}]}
    assert not verify_export(bundle, jwks_wrong)
