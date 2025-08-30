import json
import logging
import os
import time
from typing import Any, List, Dict, TypedDict, Union

from .settings import settings
from .utils import cid_for_json

logger = logging.getLogger(__name__)

def append_jsonl(path: str, obj: dict[str, object]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

class ReceiptRecord(TypedDict, total=False):
    trace_id: str
    ts: str
    cid: str
    receipt_hash: str
    prev_receipt_hash: str | None
    prev_cid: str | None
    hop: int
    normalized: Dict[str, Any]

def read_chain(trace_id: str) -> list[ReceiptRecord]:
    items: List[ReceiptRecord] = []
    path = settings.receipts_path
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if rec.get("trace_id") == trace_id:
                    items.append(rec)
            except Exception as exc:  # pragma: no cover - skip malformed lines
                logger.debug("Skipping malformed receipt line: %s", exc)
                continue
    def _hop_key(r: ReceiptRecord) -> int:
        hop_val: Union[int, Any] = r.get("hop", 0)
        return hop_val if isinstance(hop_val, int) else 0
    items.sort(key=_hop_key)
    return items

def write_receipt(trace_id: str, hop: int, normalized: Dict[str, Any]) -> ReceiptRecord:
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cid = cid_for_json(normalized)
    prev = None
    prev_cid = None
    chain = read_chain(trace_id)
    if chain:
        prev = chain[-1].get("receipt_hash")
        prev_cid = chain[-1].get("cid")
    receipt_hash = cid_for_json({"ts": ts, "cid": cid, "prev": prev, "hop": hop})
    # Persist minimal receipt plus the normalized object so downstream verifiers
    # (console chain viewer, SDKs) can recompute the CID deterministically.
    rec: ReceiptRecord = {
        "trace_id": trace_id,
        "ts": ts,
        "cid": cid,
        "receipt_hash": receipt_hash,
        "prev_receipt_hash": prev,
        "prev_cid": prev_cid,
        "hop": hop,
        "normalized": normalized,
    }
    append_jsonl(settings.receipts_path, rec)  # type: ignore[arg-type]
    return rec
