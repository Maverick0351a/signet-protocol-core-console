import json
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_allowlist(value: str | list[str] | None) -> list[str]:
    default = ["localhost", "127.0.0.1"]
    if value is None:
        return default
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    raw = value.strip()
    if raw == "":
        return []
    if raw == "*":
        return []
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except Exception:
            pass
    tokens: list[str] = []
    for chunk in raw.replace(";", ",").replace("\n", ",").split(","):
        c = chunk.strip()
        if c:
            tokens.append(c)
    return tokens or default


class Settings(BaseSettings):
    api_keys: dict[str, dict] = {}
    hel_allowlist: str | None = None  # raw env string; parsed version exposed via property
    private_key_b64: str | None = None
    kid: str = "local-dev-kid-1"
    ledger_path: str = "data/ledger.jsonl"
    receipts_path: str = "data/receipts.jsonl"
    jwks_cache_ttl: int = 3600
    max_exchange_body_bytes: int = 65536  # 64 KiB default limit

    model_config = SettingsConfigDict(env_prefix="SP_", env_file=".env", env_file_encoding="utf-8")

    @property
    def hel_allowlist_hosts(self) -> list[str]:
        return _parse_allowlist(self.hel_allowlist if isinstance(self.hel_allowlist, (str, list)) else None)


settings = Settings()
