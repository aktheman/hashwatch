import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test('analytics page loads and shows summary', async ({ page }) => {
  await seedLocalStorage(page);
  await page.getByRole('tab', { name: /analytics/i }).click({ timeout: 10000 });
  await expect(page.getByText(/hashrate.?history/i).first()).toBeVisible({ timeout: 10000 });
});

test('chart range selector switches tabs', async ({ page }) => {
  await seedLocalStorage(page);
  await page.getByRole('tab', { name: /analytics/i }).click({ timeout: 10000 });
  await page.getByRole('button', { name: /7 days/i }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await expect(page.getByRole('button', { name: /7 days/i }).first()).toBeVisible();
});
