import { defineConfig, devices } from '@playwright/test';

const port = 4173;

// SPEC 7.2: e2e tests run against the production build.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(port)}/kalendar-vystavok/`,
    trace: 'on-first-retry',
    // The service worker would serve cached builds across tests; only pwa.spec.ts allows it.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${String(port)}/kalendar-vystavok/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
