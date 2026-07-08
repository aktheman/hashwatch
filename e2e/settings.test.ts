import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('settings page shows theme options', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: /settings/i }).click({ timeout: 10000 });
  await expect(page.getByText('Theme').first()).toBeVisible({ timeout: 10000 });
});

test('settings page loads', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: /settings/i }).click({ timeout: 10000 });
  await expect(page.getByText('Remote Sync').first()).toBeVisible({ timeout: 10000 });
});
