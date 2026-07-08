import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Miner Drill Down', () => {
  test('clicking hashrate tile opens drill-down modal', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /time range/i })
      .first()
      .waitFor({ timeout: 15000 });
    const tiles = page.getByText(/Hashrate|dashboard\.hashrate/);
    await tiles.first().click({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible({ timeout: 10000 });
  });

  test('drill-down modal can be closed', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /time range/i })
      .first()
      .waitFor({ timeout: 15000 });
    const tiles = page.getByText(/Hashrate|dashboard\.hashrate/);
    await tiles.first().click({ timeout: 15000 });
    await page.getByRole('button', { name: /close/i }).click({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /close/i })).not.toBeVisible({ timeout: 5000 });
  });
});
