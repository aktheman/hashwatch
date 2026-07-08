import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Miner Detail', () => {
  test('miner detail shows alert rules section', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel(/Miner Alpha/).click({ timeout: 15000 });
    await expect(page.getByText('Alert Rules').last()).toBeVisible({ timeout: 15000 });
  });

  test('alert rules toggle switches', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel(/Miner Alpha/).click({ timeout: 15000 });
    const toggle = page.getByRole('switch', { name: /toggle alert/i });
    await expect(toggle).toBeVisible({ timeout: 15000 });
  });
});
