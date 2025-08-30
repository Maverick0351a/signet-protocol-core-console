from server.settings import Settings


def test_allowlist_json_list():
    s = Settings(hel_allowlist='["a.example","b.example"]')
    assert s.hel_allowlist_hosts == ["a.example", "b.example"]


def test_allowlist_comma_list():
    s = Settings(hel_allowlist='a.example,b.example')
    assert s.hel_allowlist_hosts == ["a.example", "b.example"]


def test_allowlist_newlines_semicolons_and_spaces():
    s = Settings(hel_allowlist='a.example; b.example\n c.example')
    assert s.hel_allowlist_hosts == ["a.example", "b.example", "c.example"]


def test_allowlist_wildcard_star_disables():
    s = Settings(hel_allowlist='*')
    assert s.hel_allowlist_hosts == []


def test_allowlist_empty():
    s = Settings(hel_allowlist='   ')
    assert s.hel_allowlist_hosts == []


def test_allowlist_malformed_json_fallback():
    # Should fall back to delimiter parsing and not raise
    s = Settings(hel_allowlist='[not-json,still]a.example,b.example')
    # Delimiter parsing yields tokens; ensure at least we captured host fragments
    assert "a.example" in s.hel_allowlist_hosts or "b.example" in s.hel_allowlist_hosts
