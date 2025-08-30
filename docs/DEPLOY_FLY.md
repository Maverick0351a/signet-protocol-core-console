# Deploy Core API to Fly.io

The core API container already listens on port 8088 (see `apps/core-api/Dockerfile`). This guide deploys it behind Fly's edge with Prometheus metrics and health checks.

## 1. Prerequisites
* Fly CLI installed: https://fly.io/docs/hands-on/install-flyctl/
* Logged in: `fly auth login`
* (Optional) Org selected: `fly orgs list`

## 2. Configure fly.toml
`fly.toml` is at repo root. Adjust:
* `app.name` – must be globally unique (e.g. `signet-core-api-yourhandle`)
* `primary_region` – closest to users
* `SP_KID`, `SP_HEL_ALLOWLIST` (placeholders ok; secrets set separately)

## 3. Generate Ed25519 Signing Key (base64url)
Python (PowerShell):
```powershell
python - <<'PY'
from nacl.signing import SigningKey; import base64
sk = SigningKey.generate()
print('SP_PRIVATE_KEY_B64=' + base64.urlsafe_b64encode(bytes(sk) ).decode().rstrip('='))
PY
```
Output value (without the prefix) becomes `SP_PRIVATE_KEY_B64`. Record the public JWK via the running service JWKS (`/.well-known/jwks.json`).

## 4. Set Fly Secrets
```powershell
fly secrets set SP_PRIVATE_KEY_B64=your32bytekeyhere SP_KID=prod-key-1 SP_HEL_ALLOWLIST="api.example.com,webhook.example.org"
```
Optional:
```powershell
fly secrets set SP_MAX_EXCHANGE_BODY_BYTES=65536
```

## 5. Launch / Deploy
If app not created yet:
```powershell
fly launch --no-deploy --copy-config
```
Then deploy:
```powershell
fly deploy
```

## 6. Verify
Replace `<app>` with your Fly app name.
```powershell
curl https://<app>.fly.dev/healthz
curl https://<app>.fly.dev/metrics --head
```

Should see `{ "ok": true, "service": "signet-core-api" }` and HTTP 200 for metrics.

## 7. Demo Exchange
```powershell
$body = '{"payload_type":"demo.echo","payload":{"msg":"hello"}}'
curl -s -X POST https://<app>.fly.dev/v1/exchange -H "content-type: application/json" -d $body | jq .
```
Then fetch chain & export (substitute returned `trace_id`):
```powershell
curl -s https://<app>.fly.dev/v1/receipts/chain/<trace_id> | jq length
resp = curl -i -s https://<app>.fly.dev/v1/receipts/export/<trace_id>
echo $resp
```

## 8. Metrics Scrape
`/metrics` is plain Prometheus. Add a scrape job pointing at the Fly hostname.

## 9. Updating
Ship new code:
```powershell
fly deploy
```

## 10. Rotating Keys
1. Generate new key (step 3) -> set new secrets with new `SP_KID` & `SP_PRIVATE_KEY_B64`.
2. Deploy.
3. Consumers fetch new JWKS with the new `kid`.

## Environment Variables Summary
| Var | Purpose |
|-----|---------|
| SP_PRIVATE_KEY_B64 | Ed25519 private seed (32 bytes, base64url, no padding). |
| SP_KID | Key ID surfaced in JWKS & response headers. |
| SP_HEL_ALLOWLIST | Comma or JSON list of allowed forward hostnames (HTTPS required). |
| SP_MAX_EXCHANGE_BODY_BYTES | Max accepted exchange request size (default 65536). |
| SP_JWKS_CACHE_TTL | Seconds JWKS public key is cached (default 3600). |

---
Troubleshooting:
* 403 on forward: ensure hostname in `SP_HEL_ALLOWLIST` and URL uses https.
* Signature mismatch: confirm client reconstructs message `${response_cid}|${trace_id}|${exported_at}`.
* Health check failing: check logs `fly logs` for stack trace; confirm container listens on 0.0.0.0:8088.
