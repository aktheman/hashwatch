import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test.describe('Settings Full', () => {
  test('shows theme section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Theme').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows plan section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Plan').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows import/export section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/Export JSON|Import Data/).first()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Groups screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Groups').last().click({ force: true });
    await expect(page.getByText(/Living Room|Garage/).last()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Wallets screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('Main Wallet').last()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Import Data screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Import Data').last().click({ force: true });
    await expect(page.getByText(/import|Import/).last()).toBeVisible({ timeout: 15000 });
  });

  test('shows notification history section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Notification History').last()).toBeVisible({ timeout: 15000 });
  });

  test('shows Alert History navigation', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Alert History').last()).toBeVisible({ timeout: 15000 });
  });
});
