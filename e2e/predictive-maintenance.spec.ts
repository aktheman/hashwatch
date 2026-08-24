import { test, expect } from '@playwright/test';
import { skipOnboarding, seedLocalStorage } from './helpers';

async function navigateToPredictiveMaintenance(page: import('@playwright/test').Page) {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page
    .getByText('Predictive Maintenance')
    .filter({ visible: true })
    .first()
    .click({ force: true });
}

test('page loads and shows title', async ({ page }) => {
  await navigateToPredictiveMaintenance(page);
  await expect(
    page
      .getByText(/predictive maintenance/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('shows uptime forecast section', async ({ page }) => {
  await navigateToPredictiveMaintenance(page);
  await expect(
    page
      .getByText(/uptime forecast/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('shows maintenance schedule section', async ({ page }) => {
  await navigateToPredictiveMaintenance(page);
  await expect(
    page
      .getByText(/maintenance schedule/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('can adjust ambient conditions', async ({ page }) => {
  await navigateToPredictiveMaintenance(page);
  await expect(
    page
      .getByText(/weather simulation/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
  const tempUp = page.getByText('+').filter({ visible: true }).first();
  await expect(tempUp).toBeVisible({ timeout: 15000 });
  await tempUp.click({ force: true });
  await expect(page.getByText(/°C/).filter({ visible: true }).first()).toBeVisible({
    timeout: 15000,
  });
});

test('weather alerts section visible', async ({ page }) => {
  await navigateToPredictiveMaintenance(page);
  await expect(
    page
      .getByText(/weather simulation/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .getByText(/alerts/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});
