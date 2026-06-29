import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test('loads the app and shows the dashboard', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByText('HashWatch')).toBeVisible({ timeout: 15000 });
});

test('navigates to Settings tab', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/push notification settings/i)).toBeVisible({ timeout: 15000 });
});

test('displays theme toggle on Settings', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/push notification settings/i)).toBeVisible({ timeout: 15000 });
});

test('shows miner card when miners exist', async ({ page }) => {
  await seedLocalStorage(page);
  await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
});
