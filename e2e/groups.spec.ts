import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Groups', () => {
  test('groups page shows group names', async ({ page }) => {
    await seedLocalStorage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('groups.title').click({ timeout: 15000 });
    await expect(page.getByText(/Living Room|Garage/).first()).toBeVisible({ timeout: 15000 });
  });

  test('group cards show miner count', async ({ page }) => {
    await seedLocalStorage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('groups.title').click({ timeout: 15000 });
    await expect(page.getByText(/groups\.minerCount/).first()).toBeVisible({ timeout: 15000 });
  });
});
