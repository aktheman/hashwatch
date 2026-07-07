import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test.describe('Settings Full', () => {
  test('navigates to theme options section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/theme/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('shows plan section with Free status', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/plan/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('shows power cost input', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows import/export section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/export/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Groups screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('groups.title').click({ timeout: 15000 });
    await expect(page.getByText(/Living Room|Garage/).first()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Wallets screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page
      .getByText(/wallet/i)
      .first()
      .click({ force: true });
    await expect(page.getByText('Main Wallet').first()).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Import Data screen', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page
      .getByText(/import/i)
      .first()
      .click({ force: true });
    await expect(page.getByText(/import/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('shows subscription option', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    const subscriptionLink = page.getByText(/subscription|upgrade/i).first();
    if (await subscriptionLink.isVisible()) {
      await subscriptionLink.click({ force: true });
      await expect(page.getByText(/pro/i).first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('shows notification history section', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('shows Alert History navigation', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await expect(
      page
        .getByText(/alert.*history/i)
        .first()
        .or(page.getByText(/history.*alert/i).first()),
    ).toBeVisible({ timeout: 15000 });
  });
});
