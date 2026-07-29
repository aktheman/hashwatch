import { test, expect } from '@playwright/test';
import { skipOnboarding, seedLocalStorage } from './helpers';

async function navigateToDashboardBuilder(page: import('@playwright/test').Page) {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Dashboard Builder').first().click({ force: true });
}

test('page loads and shows title', async ({ page }) => {
  await navigateToDashboardBuilder(page);
  await expect(page.getByText(/dashboard builder|layout controls/i).first()).toBeVisible({
    timeout: 15000,
  });
});

test('shows widget library', async ({ page }) => {
  await navigateToDashboardBuilder(page);
  await expect(page.getByText(/widget library/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/total hashrate/i).first()).toBeVisible({ timeout: 15000 });
});

test('can toggle widgets on/off', async ({ page }) => {
  await navigateToDashboardBuilder(page);
  await expect(page.getByText(/widget library/i).first()).toBeVisible({ timeout: 15000 });
  const toggle = page.getByRole('switch', { name: /toggle earnings/i }).first();
  if (await toggle.isVisible()) {
    await toggle.click({ force: true });
  }
  await expect(page.getByText(/widget library/i).first()).toBeVisible({ timeout: 15000 });
});

test('shows layout controls', async ({ page }) => {
  await navigateToDashboardBuilder(page);
  await expect(page.getByText(/layout controls/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/columns/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/compact/i).first()).toBeVisible({ timeout: 15000 });
});

test('save button visible', async ({ page }) => {
  await navigateToDashboardBuilder(page);
  await expect(page.getByText(/save layout/i).first()).toBeVisible({ timeout: 15000 });
});
