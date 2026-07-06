import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test.describe('Alert History Screen', () => {
  test('navigates to Alert History from Settings', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Alert History').first().click({ force: true });
    await expect(page.getByText('Alert History').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no alerts', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Alert History').first().click({ force: true });
    await expect(page.getByText('No alert history yet')).toBeVisible({ timeout: 10000 });
  });
});
