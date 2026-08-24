import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test('dark pool screen loads for pro users', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Dark Pool').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/dark.?pool/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('firmware screen loads', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Firmware').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/firmware/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('teams screen loads', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Teams').filter({ visible: true }).first().click({ force: true });
  await expect(page.getByText(/teams/i).filter({ visible: true }).first()).toBeVisible({
    timeout: 15000,
  });
});

test('anomaly detection screen loads', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page
    .getByText('Anomaly Detection')
    .filter({ visible: true })
    .first()
    .click({ force: true });
  await expect(
    page
      .getByText(/anomaly/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('energy tracking screen loads', async ({ page }) => {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Energy Tracking').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/energy/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});
