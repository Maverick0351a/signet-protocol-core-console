import re
import json

import pytest
from httpx import AsyncClient, ASGITransport

from server.main import app


async def _metrics_text(ac: AsyncClient) -> str:
    r = await ac.get("/metrics")
    assert r.status_code == 200
    return r.text


def _find_metric(text: str, name: str, labels: dict[str, str]) -> float:
    pattern_labels = ",".join([f'{k}="{v}"' for k, v in labels.items()])
    # Regex matches both counters and histogram counts.
    regex = re.compile(rf"^{re.escape(name)}\{{{re.escape(pattern_labels)}\}} (\d+(?:\.\d+)?)$", re.MULTILINE)
    m = regex.search(text)
    return float(m.group(1)) if m else 0.0


@pytest.mark.asyncio
async def test_idempotency_and_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Successful exchange
        r1 = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "openai.tooluse.invoice.v1",
                "target_type": "invoice.iso20022.v1",
                "payload": {"tool_calls": []},
            },
        )
        assert r1.status_code == 200
        trace_ok = r1.json()["trace_id"]

        # Denied exchange (insecure scheme)
        r_denied = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "x",
                "target_type": None,
                "payload": {},
                "forward_url": "http://localhost/deny",  # insecure
            },
        )
        assert r_denied.status_code == 403

        # Forwarded allowed exchange
        r_fwd = await ac.post(
            "/v1/exchange",
            json={
                "payload_type": "x",
                "target_type": None,
                "payload": {},
                "forward_url": "https://localhost/ok",  # allowed host
            },
        )
        assert r_fwd.status_code == 200

        # Idempotent sequence
        headers = {"X-SIGNET-Idempotency-Key": "dup-1"}
        r_first = await ac.post(
            "/v1/exchange",
            headers=headers,
            json={
                "payload_type": "p",
                "target_type": None,
                "payload": {"a": 1},
            },
        )
        assert r_first.status_code == 200
        body_first = r_first.json()
        r_second = await ac.post(
            "/v1/exchange",
            headers=headers,
            json={
                "payload_type": "p",
                "target_type": None,
                "payload": {"a": 1},
            },
        )
        assert r_second.status_code == 200
        assert r_second.headers.get("X-SIGNET-Idempotent") == "true"
        body_second = r_second.json()
        # Same trace and core fields; replay marked idempotent true
        assert body_second["trace_id"] == body_first["trace_id"]
        assert body_first.get("idempotent") is False
        assert body_second.get("idempotent") is True
        # Remove idempotent flag and compare remaining structure
        b1 = {k: v for k, v in body_first.items() if k != "idempotent"}
        b2 = {k: v for k, v in body_second.items() if k != "idempotent"}
        assert b2 == b1

        metrics = await _metrics_text(ac)
        # Basic assertions
        ok_count = _find_metric(metrics, "signet_exchanges_total", {"result": "ok"})
        denied_count = _find_metric(metrics, "signet_exchanges_total", {"result": "denied"})
        insecure_deny = _find_metric(metrics, "signet_denied_total", {"reason": "insecure_scheme"})
        forward_local = _find_metric(metrics, "signet_forward_total", {"host": "localhost"})

        assert ok_count >= 2  # success + forwarded (+ idempotent first call)
        assert denied_count >= 1
        assert insecure_deny >= 1
        assert forward_local >= 1
