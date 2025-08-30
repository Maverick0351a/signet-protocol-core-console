import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_keys: dict[str, dict] = {}
    hel_allowlist: list[str] = ["localhost", "127.0.0.1"]
    private_key_b64: str | None = None
    kid: str = "local-dev-kid-1"
    ledger_path: str = "data/ledger.jsonl"
    receipts_path: str = "data/receipts.jsonl"
    jwks_cache_ttl: int = 3600
    max_exchange_body_bytes: int = 65536  # 64 KiB default limit

    model_config = SettingsConfigDict(env_prefix="SP_", env_file=".env", env_file_encoding="utf-8")

    @field_validator("hel_allowlist", mode="before")
    @classmethod
    def parse_allowlist(cls, v: object):
        """Parse SP_HEL_ALLOWLIST from env.

        Accepted forms:
        - JSON array string: ["a.example","b.example"]
        - Comma separated string: a.example,b.example
        - Whitespace / newline separated: a.example\n b.example
        - Single '*' meaning allow all (interpreted as empty list to skip enforcement)

        Never raises: falls back to default on malformed input.
        """
        default = cls.model_fields["hel_allowlist"].default  # type: ignore[attr-defined]
        try:
            if isinstance(v, list):
                return [str(x).strip() for x in v if str(x).strip()]
            if not isinstance(v, str):
                return v
            raw = v.strip()
            if raw == "":
                return []
            if raw == "*":  # disable restriction (treat as empty list)
                return []
            # If looks like JSON list attempt to parse
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    # fall through to delimiter parsing
                    pass
            # Support newline / comma / semicolon separation
            tokens: list[str] = []
            for chunk in raw.replace(";", ",").replace("\n", ",").split(","):
                c = chunk.strip()
                if c:
                    tokens.append(c)
            return tokens or default
        except Exception:
            return default

settings = Settings()
