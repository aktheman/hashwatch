import { test, expect } from '@playwright/test';
import { skipOnboarding, seedLocalStorage } from './helpers';

async function navigateToWorldMap(page: import('@playwright/test').Page) {
  await skipOnboarding(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('World Map').filter({ visible: true }).first().click({ force: true });
}

test('page loads and shows title', async ({ page }) => {
  await navigateToWorldMap(page);
  await expect(
    page
      .getByText(/world map/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('shows map area', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('World Map').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/world map/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .getByText(/miners/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('shows location list', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('World Map').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/locations/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('can filter miners', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('World Map').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/world map/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
  const onlineFilter = page
    .getByText(/online only/i)
    .filter({ visible: true })
    .first();
  if (await onlineFilter.isVisible()) {
    await onlineFilter.click({ force: true });
  }
  await expect(
    page
      .getByText(/world map/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});

test('shows health legend', async ({ page }) => {
  await seedLocalStorage(page);
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('World Map').filter({ visible: true }).first().click({ force: true });
  await expect(
    page
      .getByText(/healthy/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .getByText(/critical/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 15000 });
});
