import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test.describe('Subscription', () => {
  test('shows subscription screen from Settings', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Plan').first().click({ force: true });
    await expect(page.getByText('HashWatch Pro').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Free and Pro plan options', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Plan').first().click({ force: true });
    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pro').first()).toBeVisible({ timeout: 10000 });
  });
});
