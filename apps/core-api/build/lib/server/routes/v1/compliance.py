from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(tags=["compliance"])

@router.get("/compliance/dashboard")
async def dashboard() -> Dict[str, Any]:
    return {"ok": True, "modules": ["annex4", "pmm"], "status": {"annex4": "ready", "pmm": "ready"}}

@router.get("/compliance/annex4/{trace_id}")
async def annex4(trace_id: str) -> Dict[str, Any]:
    return {"trace_id": trace_id, "annex4": {"sections": ["A", "B", "C"], "status": "generated"}}

@router.get("/compliance/pmm/{trace_id}")
async def pmm(trace_id: str) -> Dict[str, Any]:
    return {"trace_id": trace_id, "pmm": {"incidents": 0, "drift": "none", "status": "ok"}}
