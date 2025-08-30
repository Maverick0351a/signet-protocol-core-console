from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
import uuid
from ...utils import cid_for_json
from ...receipts import write_receipt
from ...ledger import write_ledger_entry
from ...hel import is_forward_allowed

router = APIRouter(tags=["exchange"])

class ExchangeRequest(BaseModel):
    payload_type: str
    target_type: Optional[str] = None
    payload: Dict[str, Any]
    forward_url: Optional[str] = None

class ExchangeResponse(BaseModel):
    trace_id: str
    normalized: Dict[str, Any]
    policy: Dict[str, Any]
    receipt: Dict[str, Any]
    forwarded: Optional[Dict[str, Any]] = None

@router.post("/exchange", response_model=ExchangeResponse)
async def exchange(req: ExchangeRequest):
    trace_id = str(uuid.uuid4())
    # Minimal "normalization" pass-through; real mapping occurs here
    normalized = {"Document": {"Echo": req.payload}}
    # Policy
    allowed, reason = True, "no_forward"
    forwarded = None
    if req.forward_url:
        allowed, reason = is_forward_allowed(req.forward_url)
        if not allowed:
            raise HTTPException(status_code=403, detail=f"Forward denied: {reason}")
        forwarded = {"status_code": 202, "host": req.forward_url}
    # Receipt
    receipt = write_receipt(trace_id=trace_id, hop=1, normalized=normalized)
    # Ledger entry (one per exchange hop)
    write_ledger_entry(trace_id=trace_id, hop=1, payload_type=req.payload_type, target_type=req.target_type, cid=receipt["cid"])
    policy = {"engine": "HEL", "allowed": allowed, "reason": reason, "cid": receipt["cid"]}
    return ExchangeResponse(trace_id=trace_id, normalized=normalized, policy=policy, receipt=receipt, forwarded=forwarded)
