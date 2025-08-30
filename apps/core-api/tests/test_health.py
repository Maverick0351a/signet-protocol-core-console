import pytest
from httpx import AsyncClient, ASGITransport

from server.main import app

@pytest.mark.asyncio
async def test_health():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
                r = await ac.get("/healthz")
        assert r.status_code == 200
        assert r.json()["ok"] is True
