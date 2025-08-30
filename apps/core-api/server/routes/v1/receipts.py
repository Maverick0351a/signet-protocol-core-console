import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from ...receipts import read_chain
from ...security import sign_bundle
from ...settings import settings

router = APIRouter(tags=["receipts"])

class Receipt(BaseModel):
    trace_id: str
    ts: str
    cid: str
    receipt_hash: str
    prev_receipt_hash: str | None = None
    prev_cid: str | None = None
    hop: int
    normalized: dict[str, object] | None = None

@router.get("/receipts/chain/{trace_id}", response_model=list[Receipt])
async def get_chain(trace_id: str):
    chain = read_chain(trace_id)
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")
    return chain

@router.get("/receipts/export/{trace_id}")
async def export_chain(trace_id: str):
    chain = read_chain(trace_id)
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")
    bundle: dict[str, Any] = {
        "trace_id": trace_id,
        "chain": chain,
        "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    bundle_cid = str(chain[-1]["receipt_hash"])  # simple stand-in
    exported_at = str(bundle["exported_at"])
    signature = sign_bundle(bundle_cid, trace_id, exported_at)
    # Signed export headers (stable contract)
    headers: dict[str, str] = {
        "X-SIGNET-Response-CID": bundle_cid,
        "X-SIGNET-Signature": signature,
        "X-SIGNET-KID": settings.kid,
    }
    return Response(content=json.dumps(bundle), media_type="application/json", headers=headers)
