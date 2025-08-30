import { test, expect } from '@playwright/test';

async function gotoWithRetry(page: any, url: string, attempts = 3) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'load' });
      return;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await page.waitForTimeout(500 * (i + 1));
    }
  }
  throw lastErr;
}

// Stable E2E: create exchange via Console proxy route, then verify chain viewer displays and validates hop 1.
test('demo exchange -> chain viewer verification', async ({ page, request, baseURL }) => {
  // 1) Create exchange through console proxy (/api/signet/exchange) to exercise server route.
  const payload = {
    payload_type: 'openai.tooluse.invoice.v1',
    target_type: 'invoice.iso20022.v1',
    payload: {
      tool_calls: [
        { type: 'function', function: { name: 'create_invoice', arguments: '{"invoice_id":"INV-001","amount":1000,"currency":"USD"}' } }
      ]
    },
    forward_url: 'https://localhost/webhook'
  };
  const r = await request.post(`${baseURL}/api/signet/exchange`, {
    data: payload,
    headers: { 'content-type': 'application/json' }
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  const trace = j.trace_id as string;
  expect(trace).toMatch(/[0-9a-f-]{36}/i);

  // 2) Go directly to new chain route.
  await gotoWithRetry(page, `/chains/${trace}`);
  await page.waitForSelector('body[data-hydrated="true"]');

  // 3) Assert hop card + verified status (auto-loaded).
  await expect(page.getByTestId('hop-1')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('hop-1-status')).toHaveText(/Verified/i, { timeout: 10000 });
  const chainStatus = page.getByTestId('chain-status');
  if (await chainStatus.isVisible()) await expect(chainStatus).toHaveText(/All hops verified/i);
});
