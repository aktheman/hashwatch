import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Offline mode', () => {
  test('miner data visible with localStorage data', async ({ page }) => {
    await seedLocalStorage(page);
    await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Miner Beta').first()).toBeVisible({ timeout: 5000 });
  });

  test('settings accessible from dashboard', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Theme').first()).toBeVisible({ timeout: 10000 });
  });
});
