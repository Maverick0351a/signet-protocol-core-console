# ruff: noqa: I001  (import layout intentionally minimal)
from urllib.parse import urlparse

from .settings import settings

def is_forward_allowed(forward_url: str) -> tuple[bool, str]:
    u = urlparse(forward_url)
    if u.scheme != "https":
        return False, "insecure_scheme"
    host = u.hostname or ""
    if host not in settings.hel_allowlist:
        return False, "host_not_allowlisted"
    return True, "ok"
