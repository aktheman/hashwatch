import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('page loads and shows title', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Pool Providers').first().click({ force: true });
  await expect(page.getByText(/Pool Providers/i).first()).toBeVisible({ timeout: 15000 });
});

test('available providers list visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Pool Providers').first().click({ force: true });
  await expect(page.getByText(/Not Connected/i).first()).toBeVisible({ timeout: 15000 });
});

test('connect input fields visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Pool Providers').first().click({ force: true });
  await expect(page.getByPlaceholder(/Enter API key/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Connect/i).first()).toBeVisible({ timeout: 15000 });
});

test('multi-pool overview section visible when providers connected', async ({ page }) => {
  await skipOnboarding(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hashwatch_settings') || '{}');
    stored.onboarding_complete = 'true';
    stored.pool_provider_braiins = 'test-key-braiins';
    stored.pool_provider_luxor = 'test-key-luxor';
    localStorage.setItem('hashwatch_settings', JSON.stringify(stored));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Pool Providers').first().click({ force: true });
  await expect(page.getByText(/Multi-Pool Overview/i).first()).toBeVisible({ timeout: 15000 });
});

test('can navigate to pool details', async ({ page }) => {
  await skipOnboarding(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hashwatch_settings') || '{}');
    stored.onboarding_complete = 'true';
    stored.pool_provider_braiins = 'test-key-braiins';
    localStorage.setItem('hashwatch_settings', JSON.stringify(stored));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Pool Providers').first().click({ force: true });
  await expect(page.getByText('Braiins').first()).toBeVisible({ timeout: 15000 });
});
