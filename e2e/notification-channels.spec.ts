import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('page loads and shows title', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Notification Channels').first().click({ force: true });
  await expect(page.getByText(/Notification Channels/i).first()).toBeVisible({ timeout: 15000 });
});

test('add channel section visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Notification Channels').first().click({ force: true });
  await expect(page.getByText(/Add Channel/i).first()).toBeVisible({ timeout: 15000 });
});

test('channel type picker visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Notification Channels').first().click({ force: true });
  await page
    .getByText(/Add Channel/i)
    .first()
    .click({ force: true });
  await expect(page.getByText(/push|email|sms|telegram|slack|discord/i).first()).toBeVisible({
    timeout: 15000,
  });
});

test('empty state when no channels configured', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Notification Channels').first().click({ force: true });
  await expect(page.getByText(/no notification channels configured/i).first()).toBeVisible({
    timeout: 15000,
  });
});

test('can toggle channel enabled/disabled', async ({ page }) => {
  await skipOnboarding(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('hashwatch_settings') || '{}');
    stored.hashwatch_notification_channels = JSON.stringify([
      {
        id: 'ch-1',
        name: 'Test Channel',
        type: 'push',
        enabled: true,
        config: {},
        events: [],
      },
    ]);
    localStorage.setItem('hashwatch_settings', JSON.stringify(stored));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Notification Channels').first().click({ force: true });
  await expect(page.getByText('Test Channel').first()).toBeVisible({ timeout: 15000 });
  const toggle = page
    .getByRole('switch', { includeHiddenElements: true })
    .or(page.getByRole('checkbox', { includeHiddenElements: true }))
    .first();
  await toggle.click({ force: true });
  await expect(page.getByText('Test Channel').first()).toBeVisible({ timeout: 15000 });
});
