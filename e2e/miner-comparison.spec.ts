import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Miner Comparison', () => {
  test('enters selection mode and compares two miners', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByRole('button', { name: /compare miners/i }).click({ timeout: 15000 });
    await page.getByLabel(/Miner Alpha/).click();
    await page.getByLabel(/Miner Beta/).click();
    await page.getByRole('button', { name: /compare/i, exact: true }).click({ timeout: 15000 });
    await expect(page.getByText('Miner Alpha').last()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Miner Beta').last()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/hashrate/i).last()).toBeVisible({ timeout: 15000 });
  });

  test('Compare button is disabled with single miner selected', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByRole('button', { name: /compare miners/i }).click({ timeout: 15000 });
    await page.getByLabel(/Miner Alpha/).click();
    const compareBtn = page.getByRole('button', { name: /compare/i, exact: true });
    await expect(compareBtn).toBeDisabled({ timeout: 5000 });
  });

  test('cancel selection exits selection mode', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByRole('button', { name: /compare miners/i }).click({ timeout: 15000 });
    await page.getByRole('button', { name: /cancel selection/i }).click({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /compare miners/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
