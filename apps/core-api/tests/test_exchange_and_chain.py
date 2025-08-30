import pytest
from httpx import AsyncClient, ASGITransport

from server.main import app
from server.utils import cid_for_json
from server.security import jwks_response
from signet_verify.verify import verify_export_bundle

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
        assert "X-SIGNET-Response-CID" in e.headers
        assert "X-SIGNET-Signature" in e.headers
        assert "X-SIGNET-KID" in e.headers
        response_cid = e.headers["X-SIGNET-Response-CID"]
        signature = e.headers["X-SIGNET-Signature"]
        kid = e.headers["X-SIGNET-KID"]
        bundle = e.json()
        # JWKS lookup by kid
        jwks = jwks_response()
        jwk = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
        assert jwk, "kid from headers not found in JWKS"
        assert verify_export_bundle(bundle, response_cid, signature, jwk)
        # Recompute each receipt CID from normalized payload and ensure match
        for rec in chain:
            if rec.get("normalized"):
                recomputed = cid_for_json(rec["normalized"])  # type: ignore[arg-type]
                assert recomputed == rec["cid"], f"CID mismatch on hop {rec.get('hop')}"
