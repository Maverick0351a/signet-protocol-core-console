import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const CORE_PORT = Number(process.env.CORE_PORT || 8088);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: path.join(__dirname, 'tests/e2e'),
  // Allow slower cold starts in CI; individual expect timeouts remain lower.
  timeout: 90_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  webServer: [
    {
      command: 'node scripts/e2e.start-core.mjs',
      port: CORE_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm build && pnpm start -p ' + PORT,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NODE_ENV: 'production',
        CORE_API_URL: `http://127.0.0.1:${CORE_PORT}`,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: process.env.CI ? [['junit', { outputFile: 'playwright-results.xml' }], ['list']] : 'list',
  globalSetup: require.resolve('./tests/e2e/prewarm.global-setup'),
});
