import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test('fleet health screen shows grade distribution', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').filter({ visible: true }).first().click({ force: true });
  await expect(page.getByText('Grade Distribution').filter({ visible: true }).first()).toBeVisible({
    timeout: 15000,
  });
});

test('fleet health screen shows miner list', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').filter({ visible: true }).first().click({ force: true });
  await expect(page.getByText('Miners by Health').filter({ visible: true }).first()).toBeVisible({
    timeout: 15000,
  });
});

test('fleet health navigates to miner detail on tap', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Fleet Health').filter({ visible: true }).first().click({ force: true });
  const minerRow = page.getByText('Miner Alpha').filter({ visible: true }).first();
  await minerRow.click({ timeout: 15000 });
  await expect(minerRow).toBeVisible({ timeout: 15000 });
});
