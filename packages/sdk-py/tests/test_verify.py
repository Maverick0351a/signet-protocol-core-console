from signet_verify import compute_cid_jcs

def test_cid():
    cid = compute_cid_jcs({"a":1})
    assert cid.startswith("sha256:")
