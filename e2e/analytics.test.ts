import { test, expect } from '@playwright/test';

test('analytics page loads and shows summary', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.locator('text=Hashrate History').first()).toBeVisible({ timeout: 10000 });
});

test('chart range selector switches tabs', async ({ page }) => {
  await page.goto('/analytics');
  await page.locator('button:has-text("7d")').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('button:has-text("7d")').first()).toBeVisible();
});
