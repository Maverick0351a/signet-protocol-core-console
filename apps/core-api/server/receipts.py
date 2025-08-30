# ruff: noqa: I001
import json
import logging
import os
import time

from .settings import settings
from .utils import cid_for_json

logger = logging.getLogger(__name__)

def append_jsonl(path: str, obj: dict[str, object]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def read_chain(trace_id: str) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
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
    items.sort(key=lambda r: r.get("hop", 0))
    return items

def write_receipt(trace_id: str, hop: int, normalized: dict[str, object]) -> dict[str, object]:
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cid = cid_for_json(normalized)
    prev = None
    chain = read_chain(trace_id)
    if chain:
        prev = chain[-1].get("receipt_hash")
    receipt_hash = cid_for_json({"ts": ts, "cid": cid, "prev": prev, "hop": hop})
    # Persist minimal receipt plus the normalized object so downstream verifiers
    # (console chain viewer, SDKs) can recompute the CID deterministically.
    rec = {
        "trace_id": trace_id,
        "ts": ts,
        "cid": cid,
        "receipt_hash": receipt_hash,
        "prev_receipt_hash": prev,
        "hop": hop,
        "normalized": normalized,
    }
    append_jsonl(settings.receipts_path, rec)
    return rec
