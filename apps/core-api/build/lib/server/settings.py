from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    api_keys: dict[str, dict] = {}
    hel_allowlist: List[str] = ["localhost", "127.0.0.1"]
    private_key_b64: Optional[str] = None
    kid: str = "local-dev-kid-1"
    ledger_path: str = "data/ledger.jsonl"
    receipts_path: str = "data/receipts.jsonl"
    jwks_cache_ttl: int = 3600

    model_config = SettingsConfigDict(env_prefix="SP_", env_file=".env", env_file_encoding="utf-8")

settings = Settings()
