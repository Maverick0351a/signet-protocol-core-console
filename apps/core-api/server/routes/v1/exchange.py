import json
import os
import time
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from ...hel import is_forward_allowed
from ...ledger import write_ledger_entry
from ...metrics import observe_denied, observe_error, observe_forward, observe_success
from ...receipts import write_receipt

# In-memory idempotency cache: key -> stored response dict.
_IDEMPOTENCY_CACHE: dict[str, dict] = {}
_IDEMPOTENCY_PATH = os.path.join("data", "idempotency.jsonl")

def _persist_idempotency(key: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(_IDEMPOTENCY_PATH), exist_ok=True)
    line = json.dumps({"key": key, "response": payload}, separators=(",", ":"))
    with open(_IDEMPOTENCY_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")

router = APIRouter(tags=["exchange"])

class ExchangeRequest(BaseModel):
    payload_type: str
    target_type: str | None = None
    payload: dict[str, Any]
    forward_url: str | None = None

class ExchangeResponse(BaseModel):
    trace_id: str
    normalized: dict[str, Any]
    policy: dict[str, Any]
    receipt: dict[str, Any]
    forwarded: dict[str, Any] | None = None

@router.post("/exchange", response_model=ExchangeResponse)
async def exchange(req: ExchangeRequest, request: Request):
    start = time.perf_counter()
    idem_key = request.headers.get("X-SIGNET-Idempotency-Key")
    if idem_key and idem_key in _IDEMPOTENCY_CACHE:
        cached = _IDEMPOTENCY_CACHE[idem_key]
        body_json = json.dumps(cached, separators=(",", ":"))
        return Response(
            content=body_json,
            media_type="application/json",
            headers={"X-SIGNET-Idempotent": "true"},
        )

    trace_id = str(uuid.uuid4())
    normalized = {"Document": {"Echo": req.payload}}
    allowed, reason = True, "no_forward"
    forwarded = None
    try:
        if req.forward_url:
            allowed, reason = is_forward_allowed(req.forward_url)
            if not allowed:
                duration = time.perf_counter() - start
                observe_denied(duration, reason)
                raise HTTPException(status_code=403, detail=f"Forward denied: {reason}")
            # Extract host for metrics
            from urllib.parse import urlparse

            host = urlparse(req.forward_url).hostname or "unknown"
            observe_forward(host)
            forwarded = {"status_code": 202, "host": req.forward_url}

        receipt = write_receipt(trace_id=trace_id, hop=1, normalized=normalized)
        write_ledger_entry(
            trace_id=trace_id,
            hop=1,
            payload_type=req.payload_type,
            target_type=req.target_type,
            cid=receipt["cid"],
        )
        policy = {"engine": "HEL", "allowed": allowed, "reason": reason, "cid": receipt["cid"]}
        resp_model = ExchangeResponse(
            trace_id=trace_id,
            normalized=normalized,
            policy=policy,
            receipt=receipt,
            forwarded=forwarded,
        )
        duration = time.perf_counter() - start
        observe_success(duration)
        # Persist idempotency record
        if idem_key:
            payload_dict = json.loads(resp_model.model_dump_json())
            _IDEMPOTENCY_CACHE[idem_key] = payload_dict
            _persist_idempotency(idem_key, payload_dict)
        return resp_model
    except HTTPException:
        # Already observed denied if 403 path; other HTTPException treated as error.
        raise
    except Exception:  # pragma: no cover - defensive catch
        duration = time.perf_counter() - start
        observe_error(duration)
        raise
