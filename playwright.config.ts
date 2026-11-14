import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against the real simple-express API, run with `npm run e2e`. The API must be
 * running and seeded first; see "Browser tests" in the README.
 */
export default defineConfig({
  testDir: 'e2e',
  // .e2e.ts, so that Vitest, which runs *.test.ts and *.spec.ts, leaves them alone.
  testMatch: '**/*.e2e.ts',
  // One worker shares one signed-in session across the run. The API rotates the refresh
  // cookie on every use and allows 10 logins in 15 minutes, so tests cannot each log in.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The app as it ships, on 5173, the address the API's CORS_ORIGINS allows by default.
  webServer: {
    command: 'npm run build && npx vite preview --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_API_URL: process.env.E2E_API_URL ?? 'http://localhost:3000' },
  },
});
