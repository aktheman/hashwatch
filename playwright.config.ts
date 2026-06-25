import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npx serve dist -s -l 3000',
    port: 3000,
    timeout: 120000,
  },
  use: { baseURL: 'http://localhost:3000' },
});
