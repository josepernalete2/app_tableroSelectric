import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for App Tablero Selectric
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // Sequential execution for deterministic DB/state verification
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  expect: {
    timeout: 8000
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    actionTimeout: 10000,
    navigationTimeout: 15000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
