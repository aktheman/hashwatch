import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL || 'http://localhost:8081';

test.describe('Dashboard', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page).toHaveTitle(/hashwatch/i, { timeout: 15000 });
  });

  test('dashboard renders app shell', async ({ page }) => {
    await page.goto(APP_URL);
    const appShell = page.locator(
      'nav, [data-testid="app"], [data-testid="dashboard"], main, #root, .app',
    );
    await expect(appShell.first()).toBeVisible({ timeout: 15000 });
  });

  test('dashboard shows charts or tiles', async ({ page }) => {
    await page.goto(APP_URL);
    const content = page.locator(
      'svg, canvas, .metric-tile, [aria-label*="hashrate" i], [aria-label*="efficiency" i]',
    );
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });
});
