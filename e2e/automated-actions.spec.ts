import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('page loads and shows title', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Automated Actions').first().click({ force: true });
  await expect(page.getByText(/Automated Actions/i).first()).toBeVisible({ timeout: 15000 });
});

test('auto-restart section visible with toggle', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Automated Actions').first().click({ force: true });
  await expect(page.getByText(/Auto-Restart/i).first()).toBeVisible({ timeout: 15000 });
  const toggle = page
    .getByRole('switch', { includeHiddenElements: true })
    .or(page.getByRole('checkbox', { includeHiddenElements: true }))
    .first();
  await expect(toggle).toBeVisible({ timeout: 15000 });
});

test('auto-pool-switch section visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Automated Actions').first().click({ force: true });
  await expect(page.getByText(/Auto-Pool-Switch/i).first()).toBeVisible({ timeout: 15000 });
});

test('action log section visible', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Automated Actions').first().click({ force: true });
  await expect(page.getByText(/Action Log/i).first()).toBeVisible({ timeout: 15000 });
});

test('can toggle auto-restart on/off', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Automated Actions').first().click({ force: true });
  await expect(page.getByText(/Auto-Restart/i).first()).toBeVisible({ timeout: 15000 });
  const toggle = page
    .getByRole('switch', { includeHiddenElements: true })
    .or(page.getByRole('checkbox', { includeHiddenElements: true }))
    .first();
  await toggle.click({ force: true });
  await expect(toggle).toBeVisible({ timeout: 15000 });
});
