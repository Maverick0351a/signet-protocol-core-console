import os, json, time
from typing import Dict, Any
from .settings import settings

def append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def write_ledger_entry(trace_id: str, hop: int, payload_type: str, target_type: str | None, cid: str) -> None:
    entry = {
        "trace_id": trace_id,
        "hop": hop,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "payload_type": payload_type,
        "target_type": target_type,
        "cid": cid,
    }
    append_jsonl(settings.ledger_path, entry)
