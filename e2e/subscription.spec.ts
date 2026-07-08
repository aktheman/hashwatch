import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Subscription', () => {
  test('shows subscription screen from Settings', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Plan').last().click({ force: true });
    await expect(page.getByText('HashWatch Pro').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Free and Pro plan options', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Plan').last().click({ force: true });
    await expect(page.getByText('Free').last()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pro').last()).toBeVisible({ timeout: 10000 });
  });
});
