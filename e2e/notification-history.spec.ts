import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Notification History Screen', () => {
  test('navigates to Notification History from Settings', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Notification History').last().click({ force: true });
    await expect(page.getByText('Notification History').last()).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no notification history', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Notification History').last().click({ force: true });
    await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 10000 });
  });
});
