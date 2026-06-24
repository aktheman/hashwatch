import { test, expect } from '@playwright/test';

test('settings page shows theme options', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('text=Theme').first()).toBeVisible({ timeout: 10000 });
});

test('settings page loads', async ({ page }) => {
  await page.goto('/settings');
  await expect(
    page.locator('text=Settings').first().or(page.locator('text=Remote Sync').first()),
  ).toBeVisible({ timeout: 10000 });
});
