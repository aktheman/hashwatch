import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/web',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    launchOptions: {
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  webServer: {
    command: 'npx http-server dist -p 8080 --cors -s',
    url: 'http://localhost:8080',
    reuseExistingServer: false,
    timeout: 10000,
  },
});
