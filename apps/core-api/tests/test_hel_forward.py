import pytest
from httpx import AsyncClient, ASGITransport
from server.main import app
from server.settings import settings

@pytest.mark.asyncio
async def test_forward_block_insecure_scheme():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "demo.echo",
                "payload": {"msg": "x"},
                "forward_url": "http://example.com/hook",
            },
        )
        assert r.status_code == 403
        j = r.json()
        assert j["error"] == "forward_denied"
        assert j["reason"] == "insecure_scheme"

@pytest.mark.asyncio
async def test_forward_block_not_allowlisted():
    transport = ASGITransport(app=app)
    # ensure host not in allowlist
    assert "notallowlisted.example" not in settings.hel_allowlist
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "demo.echo",
                "payload": {"msg": "x"},
                "forward_url": "https://notallowlisted.example/hook",
            },
        )
        assert r.status_code == 403
        j = r.json()
        assert j["reason"] == "host_not_allowlisted"

@pytest.mark.asyncio
async def test_forward_allowed_allowlisted_host(monkeypatch):
    # Temporarily add domain to allowlist
    monkeypatch.setattr(settings, "hel_allowlist", settings.hel_allowlist + ["allowed.example"])
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "demo.echo",
                "payload": {"msg": "x"},
                "forward_url": "https://allowed.example/hook",
            },
        )
        assert r.status_code == 200
        assert r.json()["forwarded"]["host"] == "https://allowed.example/hook"
