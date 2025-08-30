# Copilot Plan — Build the Signet Protocol Core + Console

## Goal
Implement a production-ready **core API** (FastAPI) and **Console** (Next.js 15) with verifiable receipts, exchange pipeline, compliance kit stubs, and a professional web UI that can be deployed to Vercel. Provide SDKs for JS and Python to verify receipts.

## Constraints
- Use modern, maintained dependencies (Next 15, React 19, TypeScript >=5.8, Playwright 1.55+, FastAPI 0.115+, Pydantic v2, Uvicorn 0.35+).
- Keep secrets out of client code. Use server-side routes/APIs and environment variables.
- Provide clear tests: pytest for Python, Vitest for TS unit, Playwright for e2e.

## Step-by-step Tasks

### 1) Core API (apps/core-api)
- [ ] Implement `/healthz`, `/metrics`, `/.well-known/jwks.json`.
- [ ] Implement `/v1/exchange` (sanitize -> canonicalize -> compute CID -> minimal normalize -> receipt).
- [ ] Implement receipt storage to `data/receipts.jsonl` and ledger to `data/ledger.jsonl`.
- [ ] Implement `/v1/receipts/chain/{trace_id}` and `/v1/receipts/export/{trace_id}` with Ed25519 signature headers.
- [ ] Wire basic HEL allowlist check for `forward_url` (deny on non-https by default).
- [ ] Add compliance stubs: `/v1/compliance/dashboard`, `/v1/compliance/annex4/{trace_id}`, `/v1/compliance/pmm/{trace_id}`.
- [ ] Unit/integration tests with `pytest`, `httpx`, `pytest-asyncio`; crypto tests with `PyNaCl`.

### 2) Console (apps/console)
- [ ] Hero with Signet brand, **Q&A** pane (server API route `/api/ask` reading `LLM_PROVIDER` and `LLM_API_KEY` and using Signet docs context).
- [ ] **Exchange Playground**: form to POST to `core-api` `/v1/exchange` (via server proxy route `/api/signet/exchange` to avoid exposing secrets).
- [ ] **Chain Viewer**: input `trace_id` -> fetch chain + export -> verify signature with `sdk-js` in browser.
- [ ] **Compliance** dashboard: call compliance endpoints and render PDF/HTML links.
- [ ] **Status & Metrics**: poll `/healthz` + `/metrics` parse selected counters (exchanges_total, denied_total, latency p95 indicator).
- [ ] **SDK Hub**: copy-paste code snippets for JS/Python.
- [ ] E2E tests: open home, run demo exchange against local API, view chain.

### 3) SDKs
- [ ] `packages/sdk-js`: provide `computeCidJcs(obj)` using JCS canonicalization and SHA-256; `verifyReceipt(receipt, jwks)` with Ed25519.
- [ ] `packages/sdk-py`: same primitives in Python with `rfc8785` and `PyNaCl`.
- [ ] Publish-ready configs but leave publishing for later.

### 4) Quality Gates
- [ ] Add `ruff`, `mypy`, `bandit`, `pip-audit` to core-api.
- [ ] Add `eslint`, `prettier`, `typescript --noEmit`, `npm audit` to console + sdk-js.
- [ ] GitHub Actions workflows to run tests/linters on PR.

### 5) Vercel
- [ ] Add `apps/console/vercel.json` (optional) and deployment notes in README.
- [ ] Ensure environment variables are documented in `apps/console/.env.local.example`.

### 6) Documentation
- [ ] Update `README.md` with quick start, health check, demo exchange, chain viewer, and verification snippets.
- [ ] Add `docs/` pages for SR-1/SVX-1 summaries and compliance kit overview.

---

## Non-Goals (for now)
- Full Transparency Log (Merkle tree) — leave as future module.
- Stripe billing integration — scaffolding only.
- Production databases — default to JSONL files; add Postgres adapter later.
