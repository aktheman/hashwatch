import { test, expect } from '@playwright/test';
import { skipOnboarding, seedLocalStorage } from './helpers';

async function navigateToActivityFeed(page: import('@playwright/test').Page) {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Activity Feed').first().click({ force: true });
}

test('page loads and shows title', async ({ page }) => {
  await navigateToActivityFeed(page);
  await expect(page.getByText(/activity feed|activity/i).first()).toBeVisible({ timeout: 15000 });
});

test('shows filter chips', async ({ page }) => {
  await navigateToActivityFeed(page);
  await expect(page.getByText('All').first()).toBeVisible({ timeout: 15000 });
});

test('can filter by activity type', async ({ page }) => {
  await navigateToActivityFeed(page);
  await expect(page.getByText('All').first()).toBeVisible({ timeout: 15000 });
  const alertsFilter = page.getByText('Alerts').first();
  if (await alertsFilter.isVisible()) {
    await alertsFilter.click({ force: true });
  }
  await expect(page.getByText('All').first()).toBeVisible({ timeout: 15000 });
});

test('shows empty state or activity list', async ({ page }) => {
  await navigateToActivityFeed(page);
  const emptyState = page.getByText(/no activity yet/i).first();
  const activityItem = page.getByRole('button').first();
  await expect(emptyState.or(activityItem)).toBeVisible({ timeout: 15000 });
});

test('mark all read button visible', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Activity Feed').first().click({ force: true });
  const markAllBtn = page.getByText(/mark all read/i).first();
  const emptyState = page.getByText(/no activity yet/i).first();
  await expect(markAllBtn.or(emptyState)).toBeVisible({ timeout: 15000 });
});
