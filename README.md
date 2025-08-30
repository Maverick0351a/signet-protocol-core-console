<h1 align="center">Signet Protocol Monorepo</h1>
<p align="center"><strong>FastAPI Core • Next.js Console • JS & Python Verification SDKs • Playwright E2E</strong></p>

## Overview
Signet Protocol provides a verifiable exchange (VEx) primitive: each AI ↔ AI (or service ↔ service) interaction emits a signed, hash‑chained receipt. This repo bundles:

| Component | Path | Description |
|-----------|------|-------------|
| Core API | `apps/core-api` | FastAPI service: exchange endpoint, receipt hashing & chaining, export + signed bundle, basic compliance + metrics. |
| Console | `apps/console` | Next.js 15 App Router UI: Hero Q&A, Exchange Playground, Chain Viewer (verifies CIDs + bundle signature), Metrics & Compliance stubs. |
| JS SDK | `packages/sdk-js` | Canonical JSON → CID, Ed25519 bundle verification (browser/node). |
| Python SDK | `packages/sdk-py` | Python verifier mirroring JS logic. |

## Quick Start
Prereqs: Node 20+, pnpm 9+, Python 3.11+ (or 3.13), Git.

```powershell
git clone https://github.com/Maverick0351a/signet-protocol-core-console.git
cd signet-protocol-core-console
pnpm install
python -m pip install -e apps/core-api[dev]
pnpm --filter signet-console dev  # starts Next.js (set CORE_API_URL first or use .env.local)
# In another shell run core if not auto-started:
python -m uvicorn server.main:app --app-dir apps/core-api/server --port 8088
```

Visit http://localhost:3000 then run a demo exchange in the playground; copy the trace id into the Chain Viewer or open `/chains/<trace>` directly.

## Environment
Create `apps/console/.env.local`:
```
CORE_API_URL=http://127.0.0.1:8088
```

## Testing
- Unit (Console): `pnpm --filter signet-console test`
- E2E (production build, launches both servers): `pnpm --filter signet-console e2e`
- Python tests (core-api): `pytest -q apps/core-api/tests`

E2E hardening:
* Production build (no dev flakiness)
* Hydration marker `body[data-hydrated="true"]`
* Retry navigation helper & pre-warm globalSetup

## Receipt & Bundle Model
1. Normalize: `normalized = { "Document": { "Echo": <original_payload> } }`
2. CID: RFC8785 canonicalize + SHA-256 `sha256:<hex>`
3. Append receipt: includes `cid`, `hop`, `prev_receipt_hash`, `receipt_hash` (hash of ts+cid+prev+hop)
4. Export bundle: returns full chain + `exported_at`, adds headers:
	* `X-ODIN-Response-CID` (last receipt_hash)
	* `X-ODIN-Signature` (Ed25519 over `responseCid|trace_id|exported_at`)
	* `X-ODIN-KID` key id

## Verifying (JS)
```ts
import { computeCidJcs, verifyReceiptExport } from 'signet-verify-js';
// recompute individual receipt CIDs using rec.normalized
```

## CI
GitHub Actions workflow `.github/workflows/e2e.yml` builds & runs Playwright tests (chromium). Add more matrices or caching as needed.

## Windows Notes
If `No module named uvicorn` during E2E: ensure the Python used by the Playwright webServer has dev deps installed:
```powershell
$env:PYTHON = "C:\\Path\\To\\python.exe"
python -m pip install -e apps/core-api[dev]
```
The startup script falls back to `py` if `PYTHON` not set.

## Project Scripts
| Script | Location | Purpose |
|--------|----------|---------|
| `pnpm --filter signet-console dev` | console | Dev server (Next.js) |
| `pnpm --filter signet-console build` | console | Production build |
| `pnpm --filter signet-console e2e` | console | Run Playwright (starts core + console) |
| `python -m uvicorn server.main:app` | core-api | Run core locally |

## Extending
Ideas:
* Add authenticated API keys & per-tenant signing keys.
* Expand compliance routes (policy evaluation, forward allowlists UI).
* Add per-receipt signatures (then receipt-level verification in SDKs).
* Stream receipts to a durable ledger (PostgreSQL or object store).

## Security
This is a reference prototype. Perform a security review before production: secret management, key rotation, rate limiting, authn/z, and supply-chain scanning.

## License
Apache-2.0. See `LICENSE`.

---
Questions / feedback welcome: open an issue or PR.
