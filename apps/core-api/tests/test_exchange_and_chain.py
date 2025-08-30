import pytest
from httpx import AsyncClient, ASGITransport

from server.main import app

@pytest.mark.asyncio
async def test_exchange_chain_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "openai.tooluse.invoice.v1",
                "target_type": "invoice.iso20022.v1",
                "payload": {
                    "tool_calls": [
                        {
                            "type": "function",
                            "function": {"name": "create_invoice", "arguments": "{}"},
                        }
                    ]
                },
            },
        )
        assert r.status_code == 200
        trace_id = r.json()["trace_id"]

        c = await ac.get(f"/v1/receipts/chain/{trace_id}")
        assert c.status_code == 200
        chain = c.json()
        assert len(chain) >= 1

        e = await ac.get(f"/v1/receipts/export/{trace_id}")
        assert e.status_code == 200
        assert "X-ODIN-Response-CID" in e.headers
        assert "X-ODIN-Signature" in e.headers
