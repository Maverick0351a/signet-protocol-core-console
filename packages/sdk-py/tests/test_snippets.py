from signet_verify.verify import compute_cid_jcs, verify_export_bundle

def test_compute_cid_prefix():
    cid = compute_cid_jcs({"a":1,"b":2})
    assert cid.startswith("sha256:")


def test_verify_export_bundle_structure_fail():
    bundle = {"trace_id":"t","exported_at":"2024-01-01T00:00:00Z","chain":[{"trace_id":"t","ts":"2024-01-01T00:00:00Z","cid":"sha256:abc","receipt_hash":"h1","hop":1}]}
    # 32 byte fake key (all zeros) base64url: 43 'A's -> padded adjusted for 32 bytes (==> 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=') but remove padding for b64url
    fake_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # length corresponds to 32 zero bytes decoded
    assert verify_export_bundle(bundle, "different", "sig", {"kty":"OKP","crv":"Ed25519","x": fake_key}) is False
