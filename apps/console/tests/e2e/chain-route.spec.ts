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

test('chain route direct load', async ({ request, page, baseURL }) => {
  // Create exchange via console proxy
  const payload = {
    payload_type: 'openai.tooluse.invoice.v1',
    target_type: 'invoice.iso20022.v1',
    payload: { tool_calls: [{ type: 'function', function: { name: 'create_invoice', arguments: '{"invoice_id":"INV-002","amount":250,"currency":"USD"}' } }] },
  };
  const r = await request.post(`${baseURL}/api/signet/exchange`, { data: payload, headers: { 'content-type': 'application/json' } });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  const trace = j.trace_id as string;
  expect(trace).toMatch(/[0-9a-f-]{36}/i);

  await gotoWithRetry(page, `/chains/${trace}`);
  await page.waitForSelector('body[data-hydrated="true"]');
  await expect(page.getByTestId('trace-id')).toContainText(trace);
  await expect(page.getByTestId('hop-1')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('hop-1-status')).toHaveText(/Verified/i, { timeout: 10000 });
});
