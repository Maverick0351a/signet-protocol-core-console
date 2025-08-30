import hashlib
import json
from typing import Any, Union, TYPE_CHECKING, cast

if TYPE_CHECKING:  # pragma: no cover - for type hints only
    from types import ModuleType
    rfc8785: ModuleType | None
try:  # runtime optional import
    import rfc8785  # noqa: F401
except ImportError:  # pragma: no cover
    rfc8785 = None

def _canonicalize(obj: Any) -> Union[str, bytes]:
    lib = rfc8785
    if lib is not None:
        if hasattr(lib, "canonicalize"):
            fn = getattr(lib, "canonicalize")
            return cast(Any, fn)(obj)
        if hasattr(lib, "dumps"):
            fn = getattr(lib, "dumps")
            return cast(Any, fn)(obj)
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def cid_for_json(obj: Any) -> str:
    data = _canonicalize(obj)
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    return "sha256:" + sha256_hex(data_bytes)
