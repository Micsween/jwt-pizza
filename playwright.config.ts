import { defineConfig, devices } from '@playwright/test';

/*
 * Headed Chromium's default X11 backend crashes (SIGTRAP) under WSLg, which is what
 * the VS Code "Show browser" option uses. Its Wayland backend works, so opt into it
 * when we're running somewhere Wayland is available.
 */
function useWayland(): boolean {
  // WSL_DISTRO_NAME is only set inside WSL, so this doesn't affect CI or other machines.
  return process.env.WSL_DISTRO_NAME !== undefined;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 5000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 800, height: 600 },
        launchOptions: { args: useWayland() ? ['--ozone-platform=wayland'] : [] },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 5000,
  },
});