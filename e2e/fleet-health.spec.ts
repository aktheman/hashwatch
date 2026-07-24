import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test('fleet health screen shows grade distribution', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').first().click({ force: true });
  await expect(page.getByText('Grade Distribution').first()).toBeVisible({ timeout: 15000 });
});

test('fleet health screen shows miner list', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').first().click({ force: true });
  await expect(page.getByText('Miners by Health').first()).toBeVisible({ timeout: 15000 });
});

test('fleet health navigates to miner detail on tap', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').first().click({ force: true });
  await page.getByText('Miner Alpha').first().click({ force: true });
  await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 15000 });
});
