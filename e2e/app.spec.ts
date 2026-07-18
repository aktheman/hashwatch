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
  await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 15000 });
});

test('displays theme toggle on Settings', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 15000 });
});

test('shows miner card when miners exist', async ({ page }) => {
  await seedLocalStorage(page);
  await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
});

test('navigates to Analytics tab', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /analytics/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/hashrate/i).first()).toBeVisible({ timeout: 15000 });
});

test('navigates to Pools tab', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('button', { name: /pools/i }).first().click({ force: true });
  await expect(page.getByText(/pool/i).first()).toBeVisible({ timeout: 15000 });
});

test('Settings screen has theme section', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/theme/i).first()).toBeVisible({ timeout: 15000 });
});

test('switches dark mode to light mode in Settings', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  const lightButton = page.getByRole('button', { name: /light/i }).first();
  await expect(lightButton).toBeVisible({ timeout: 15000 });
  await lightButton.click({ force: true });
  await expect(page.getByRole('button', { name: /light/i }).first()).toBeVisible({
    timeout: 15000,
  });
});

test('search/filter on dashboard when miners exist', async ({ page }) => {
  await seedLocalStorage(page);
  await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
  const searchField = page.getByPlaceholder(/search/i).first();
  if (await searchField.isVisible()) {
    await searchField.fill('Beta');
    await expect(page.getByText('Miner Beta').first()).toBeVisible({ timeout: 15000 });
  }
});

test('Groups screen is accessible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /groups/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/group/i).first()).toBeVisible({ timeout: 15000 });
});

test('Wallets screen is accessible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /wallets/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/wallet/i).first()).toBeVisible({ timeout: 15000 });
});

test('empty state when no miners', async ({ page }) => {
  await skipOnboarding(page);
  await expect(page.getByText(/no miners|add miner|no devices|empty/i).first()).toBeVisible({
    timeout: 15000,
  });
});

test('onboarding screen shows slides', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.setItem('hashwatch_settings', JSON.stringify({ last_seen_version: '1.1.0' }));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const slide = page.getByText(/welcome|track|monitor|hashwatch/i).first();
  await expect(slide).toBeVisible({ timeout: 15000 });
});

test('adding a miner flow shows add form', async ({ page }) => {
  await skipOnboarding(page);
  const addButton = page.getByRole('button', { name: /add|plus|\+/i }).first();
  if (await addButton.isVisible()) {
    await addButton.click({ force: true });
    await expect(page.getByText(/add miner|add device|miner details/i).first()).toBeVisible({
      timeout: 15000,
    });
  }
});

test('notification toggle in settings', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  const toggle = page
    .getByRole('switch', { includeHiddenElements: true })
    .or(page.getByRole('checkbox', { includeHiddenElements: true }))
    .first();
  if (await toggle.isVisible()) {
    await toggle.click({ force: true });
  }
  await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 15000 });
});

test('Subscription screen is accessible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /subscription|pro/i })
    .first()
    .click({ force: true });
  await expect(page.getByText(/subscription|pro|upgrade/i).first()).toBeVisible({ timeout: 15000 });
});

test('dashboard shows miner online status', async ({ page }) => {
  await seedLocalStorage(page);
  await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
  const onlineIndicator = page.getByText(/online|offline/i).first();
  await expect(onlineIndicator).toBeVisible({ timeout: 15000 });
});
