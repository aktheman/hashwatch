import { test, expect } from '@playwright/test';
import { seedLocalStorage, seedAlertHistory } from './helpers';

async function openAlertHistory(page: import('@playwright/test').Page) {
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click({ force: true });
  await page.getByText('Alert History').last().click({ force: true });
  await expect(page.getByText('Alert History').last()).toBeVisible({ timeout: 15000 });
}

test.describe('Alert History Screen', () => {
  test('navigates to Alert History from Settings', async ({ page }) => {
    await seedLocalStorage(page);
    await openAlertHistory(page);
  });

  test('shows empty state when no alerts', async ({ page }) => {
    await seedLocalStorage(page);
    await openAlertHistory(page);
    await expect(page.getByText('No alert history yet')).toBeVisible({ timeout: 10000 });
  });

  test('shows seeded alert events', async ({ page }) => {
    await seedAlertHistory(page);
    await openAlertHistory(page);
    await expect(page.getByText('Miner Alpha went offline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Miner Beta is back online')).toBeVisible({ timeout: 10000 });
  });

  test('search filters the alert list', async ({ page }) => {
    await seedAlertHistory(page);
    await openAlertHistory(page);
    await page.getByPlaceholder('Search alerts...').fill('went offline');
    await expect(page.getByText('Miner Alpha went offline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Miner Beta is back online')).not.toBeVisible();
    await expect(page.getByText('Miner Alpha temperature high')).not.toBeVisible();
  });

  test('renders filter chips', async ({ page }) => {
    await seedAlertHistory(page);
    await openAlertHistory(page);
    for (const chip of ['All', 'Offline', 'Online', 'Hot', 'Hashrate Drop', 'Pool Lost']) {
      await expect(page.getByRole('button', { name: chip, exact: true })).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('tapping the Offline filter chip filters the list', async ({ page }) => {
    await seedAlertHistory(page);
    await openAlertHistory(page);
    await page.getByRole('button', { name: 'Offline', exact: true }).click({ force: true });
    await expect(page.getByText('Miner Alpha went offline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Miner Beta is back online')).not.toBeVisible();
    await expect(page.getByText('Miner Alpha temperature high')).not.toBeVisible();
  });
});
