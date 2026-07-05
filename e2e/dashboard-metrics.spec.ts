import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test.describe('Dashboard Metrics', () => {
  test('shows time range chips', async ({ page }) => {
    await seedLocalStorage(page);
    await expect(page.getByLabel('Time range: 1H')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Time range: 6H')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Time range: 24H')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Time range: 7D')).toBeVisible({ timeout: 15000 });
  });

  test('clicking 1H chip changes active range', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel('Time range: 1H').click();
    await expect(page.getByLabel('Time range: 1H')).toBeVisible({ timeout: 15000 });
  });

  test('metric tiles are tappable', async ({ page }) => {
    await seedLocalStorage(page);
    await expect(page.getByLabel('View dashboard.hashrate details').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('tapping hashrate metric opens drill-down', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel('View dashboard.hashrate details').first().click({ timeout: 15000 });
    await expect(page.getByLabel('Close drill-down')).toBeVisible({ timeout: 15000 });
  });

  test('drill-down modal shows miner names', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel('View dashboard.hashrate details').first().click({ timeout: 15000 });
    await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Miner Beta').first()).toBeVisible({ timeout: 15000 });
  });

  test('drill-down modal can be closed', async ({ page }) => {
    await seedLocalStorage(page);
    await page.getByLabel('View dashboard.hashrate details').first().click({ timeout: 15000 });
    await page.getByLabel('Close').click();
    await expect(page.getByLabel('Close drill-down')).not.toBeVisible({ timeout: 5000 });
  });
});
