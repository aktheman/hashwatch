import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test.describe('Wallets Screen', () => {
  test('navigates to Wallets from Settings', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').first().click({ force: true });
    await expect(page.getByText('Wallets').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows seeded wallet', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').first().click({ force: true });
    await expect(page.getByText('Main Wallet').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no wallets', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').first().click({ force: true });
    await expect(page.getByText('No Wallets').first()).toBeVisible({ timeout: 10000 });
  });
});
