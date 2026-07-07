import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test.describe('Import Data', () => {
  test('import screen shows textarea and import button', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ImportData');
    await expect(page.getByText('import.title')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Paste JSON backup data')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /import data/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows error for empty import', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ImportData');
    await page.getByRole('button', { name: /import data/i }).click();
    await expect(page.getByText('import.noData')).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/ImportData');
    await page.getByLabel('Paste JSON backup data').fill('not valid json');
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.failed');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: /import data/i }).click();
  });
});
