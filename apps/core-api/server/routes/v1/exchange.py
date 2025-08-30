import json
import logging
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
from ...settings import settings

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
    idempotent: bool = False

@router.post("/exchange", response_model=ExchangeResponse)
async def exchange(req: ExchangeRequest, request: Request):
    start = time.perf_counter()
    idem_key = request.headers.get("X-SIGNET-Idempotency-Key")

    # Content-Length guard (header)
    cl_header = request.headers.get("content-length")
    if cl_header:
        try:
            if int(cl_header) > settings.max_exchange_body_bytes:
                return Response(
                    content=json.dumps({
                        "error": "payload_too_large",
                        "message": "Request body exceeds size limit",
                    }),
                    status_code=413,
                    media_type="application/json",
                )
        except ValueError:
            logging.getLogger(__name__).debug("Invalid Content-Length header: %s", cl_header)
    if idem_key and idem_key in _IDEMPOTENCY_CACHE:
        cached = _IDEMPOTENCY_CACHE[idem_key]
        # Ensure idempotent flag true
        if isinstance(cached, dict):
            cached["idempotent"] = True
        body_json = json.dumps(cached, separators=(",", ":"))
        trace_cached = cached.get("trace_id", "") if isinstance(cached, dict) else ""
        return Response(
            content=body_json,
            media_type="application/json",
            headers={
                "X-SIGNET-Idempotent": "true",
                "X-SIGNET-Trace": trace_cached,
            },
        )

    trace_id = str(uuid.uuid4())
    normalized: dict[str, Any] = {"Document": {"Echo": req.payload}}
    # Enforce computed size after normalization (approx):
    try:
        body_bytes = json.dumps(req.model_dump()).encode("utf-8")
        if len(body_bytes) > settings.max_exchange_body_bytes:
            return Response(
                content=json.dumps({
                    "error": "payload_too_large",
                    "message": "Request body exceeds size limit",
                }),
                status_code=413,
                media_type="application/json",
            )
    except Exception as exc:  # pragma: no cover - defensive
        logging.getLogger(__name__).debug("Failed to compute body size: %s", exc)
    allowed, reason = True, "no_forward"
    forwarded = None
    try:
        if req.forward_url:
            allowed, reason = is_forward_allowed(req.forward_url)
            if not allowed:
                duration = time.perf_counter() - start
                observe_denied(duration, reason)
                # Structured policy violation response
                return Response(
                    content=json.dumps({
                        "error": "forward_denied",
                        "reason": reason,
                        "message": f"Forward denied: {reason}",
                    }),
                    status_code=403,
                    media_type="application/json",
                )
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
            cid=str(receipt["cid"]),
        )
        policy = {"engine": "HEL", "allowed": allowed, "reason": reason, "cid": receipt["cid"]}
        # Convert receipt TypedDict to plain dict for Pydantic model compatibility
        resp_model = ExchangeResponse(
            trace_id=trace_id,
            normalized=normalized,
            policy=policy,
            receipt=dict(receipt),
            forwarded=forwarded,
            idempotent=False,
        )
        duration = time.perf_counter() - start
        observe_success(duration)
        # Persist idempotency record
        if idem_key:
            payload_dict = json.loads(resp_model.model_dump_json())
            _IDEMPOTENCY_CACHE[idem_key] = payload_dict
            _persist_idempotency(idem_key, payload_dict)
        # Return with trace header
        return Response(
            content=resp_model.model_dump_json(),
            media_type="application/json",
            headers={
                "X-SIGNET-Trace": trace_id,
            },
        )
    except HTTPException:
        # Already observed denied if 403 path; other HTTPException treated as error.
        raise
    except Exception:  # pragma: no cover - defensive catch
        duration = time.perf_counter() - start
        observe_error(duration)
        raise
