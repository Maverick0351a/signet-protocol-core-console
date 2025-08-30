import os, json, time
from typing import Dict, Any, List, Optional
from .settings import settings
from .utils import cid_for_json

def append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def read_chain(trace_id: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    path = settings.receipts_path
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if rec.get("trace_id") == trace_id:
                    items.append(rec)
            except Exception:
                continue
    items.sort(key=lambda r: r.get("hop", 0))
    return items

def write_receipt(trace_id: str, hop: int, normalized: Dict[str, Any]) -> Dict[str, Any]:
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cid = cid_for_json(normalized)
    prev = None
    chain = read_chain(trace_id)
    if chain:
        prev = chain[-1].get("receipt_hash")
    receipt_hash = cid_for_json({"ts": ts, "cid": cid, "prev": prev, "hop": hop})
    rec = {"trace_id": trace_id, "ts": ts, "cid": cid, "receipt_hash": receipt_hash, "prev_receipt_hash": prev, "hop": hop}
    append_jsonl(settings.receipts_path, rec)
    return rec
