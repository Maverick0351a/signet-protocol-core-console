from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import List, Dict, Any
from ...receipts import read_chain
from ...security import sign_bundle
import time

router = APIRouter(tags=["receipts"])

class Receipt(BaseModel):
    trace_id: str
    ts: str
    cid: str
    receipt_hash: str
    prev_receipt_hash: str | None = None
    hop: int

@router.get("/receipts/chain/{trace_id}", response_model=List[Receipt])
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
    bundle = {"trace_id": trace_id, "chain": chain, "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    bundle_cid = chain[-1]["receipt_hash"]  # simple stand-in
    signature = sign_bundle(bundle_cid, trace_id, bundle["exported_at"])
    headers = {
        "X-ODIN-Response-CID": bundle_cid,
        "X-ODIN-Signature": signature,
        "X-ODIN-KID": "local-dev-kid-1"
    }
    import json
    return Response(content=json.dumps(bundle), media_type="application/json", headers=headers)
