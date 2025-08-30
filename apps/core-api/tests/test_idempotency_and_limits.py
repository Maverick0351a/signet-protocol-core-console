import pytest
from httpx import AsyncClient, ASGITransport
from server.main import app
from server.settings import settings

@pytest.mark.asyncio
async def test_idempotent_replay_same_response():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        key = "test-idem-key-123"
        first = await ac.post("/v1/exchange", headers={"X-SIGNET-Idempotency-Key": key}, json={
            "payload_type": "demo.echo",
            "payload": {"v": 1},
        })
        assert first.status_code == 200
        body1 = first.json()
        assert body1.get("idempotent") is False
        trace_id = body1["trace_id"]
        second = await ac.post("/v1/exchange", headers={"X-SIGNET-Idempotency-Key": key}, json={
            "payload_type": "demo.echo",
            "payload": {"v": 999},  # different but should be ignored
        })
        assert second.status_code == 200
        body2 = second.json()
        # replay must keep original trace and mark idempotent
        assert body2["trace_id"] == trace_id
        assert body2.get("idempotent") is True
        # ensure header present
        assert second.headers.get("X-SIGNET-Idempotent") == "true"

@pytest.mark.asyncio
async def test_payload_size_limit(monkeypatch):
    # reduce limit for test
    monkeypatch.setattr(settings, "max_exchange_body_bytes", 200)
    transport = ASGITransport(app=app)
    big_payload = {"payload_type": "demo.echo", "payload": {"data": "x" * 500}}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/v1/exchange", json=big_payload)
        assert r.status_code == 413
        j = r.json()
        assert j["error"] == "payload_too_large"
        assert "exceeds" in j["message"].lower()
