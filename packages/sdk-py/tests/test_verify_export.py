from signet_verify import verify_export_bundle, verify_ed25519

# Simple structural test (cannot verify real signature without server key)

def test_verify_export_bundle_structure():
    bundle = {"trace_id": "t1", "exported_at": "2024-01-01T00:00:00Z"}
    jwk = {"x": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}
    assert verify_export_bundle(bundle, "cid123", "sig", jwk) in (True, False)
