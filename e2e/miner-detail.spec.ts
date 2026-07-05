import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Miner Detail', () => {
  test('miner detail shows alert rules section', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByText('Miner Alpha').first().click({ timeout: 15000 });
    await expect(page.getByText('minerDetail.alertRules').first()).toBeVisible({ timeout: 15000 });
  });

  test('alert rules toggle switches', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByText('Miner Alpha').first().click({ timeout: 15000 });
    const toggle = page.getByLabel('Toggle alert rules');
    await expect(toggle).toBeVisible({ timeout: 15000 });
  });
});
