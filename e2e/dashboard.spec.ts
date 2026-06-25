import { test, expect } from '@playwright/test';
import { seedLocalStorage, clearLocalStorage, skipOnboarding } from './helpers';

test.describe('Dashboard E2E', () => {
  test('page loads and shows the app title', async ({ page }) => {
    await skipOnboarding(page);
    await expect(page.getByText('HashWatch')).toBeVisible({ timeout: 15000 });
  });

  test('dashboard renders with tabs', async ({ page }) => {
    await skipOnboarding(page);
    await expect(page.getByRole('tab', { name: /dashboard/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('miner card appears when miners exist', async ({ page }) => {
    await seedLocalStorage(page);
    await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
  });

  test('navigation between tabs works', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/push notification settings/i)).toBeVisible({ timeout: 15000 });
  });

  test('theme toggle works on Settings page', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/push notification settings/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows empty Add miner button when no miners', async ({ page }) => {
    await clearLocalStorage(page);
    await expect(page.getByRole('button', { name: 'Add Miner', exact: true })).toBeVisible({
      timeout: 15000,
    });
  });
});
