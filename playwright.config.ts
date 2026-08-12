import { defineConfig, devices } from '@playwright/test';
const PORT = Number(process.env.E2E_PORT ?? 4336);
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --host 127.0.0.1: astro preview otherwise binds IPv6-only ([::1]) on
    // some hosts, and the health-check URL below polls IPv4.
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Astro 7 daemonizes `astro preview` when it detects an agentic environment
    // (am-i-vibing), which makes the parent exit and Playwright report
    // "Process from config.webServer exited early". Astro skips that detection
    // when ASTRO_PREVIEW_BACKGROUND is set (it's the marker its own daemon
    // child uses), keeping the server in the foreground. No-op in normal CI.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
  },
});
