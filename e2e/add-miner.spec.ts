import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test.describe('Add Miner', () => {
  test('shows Add Miner button on dashboard', async ({ page }) => {
    await skipOnboarding(page);
    await expect(page.getByRole('button', { name: /add miner/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('can navigate to Subscription from add miner flow', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /add miner/i })
      .first()
      .click({ force: true });
    await expect(page.getByText('Add by IP').first()).toBeVisible({ timeout: 10000 });
  });
});
