import { test, expect } from '@playwright/test';
import { skipOnboarding, seedLocalStorage } from './helpers';

test.describe('Import Data', () => {
  test('import screen shows textarea and import button', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    await expect(page.getByText(/Import Data|import\.title/).last()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel('Paste JSON backup data')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Import data', exact: true }).last()).toBeVisible(
      { timeout: 5000 },
    );
  });

  test('shows error for empty import', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.noData');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Import data', exact: true }).last().click();
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    await page.getByLabel('Paste JSON backup data').fill('not valid json');
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.failed');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Import data', exact: true }).last().click();
  });

  test('shows error for wrong version format', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    await page.getByLabel('Paste JSON backup data').fill(
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        miners: [],
        snapshots: [],
        wallets: [],
        settings: {},
      }),
    );
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.failed');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Import data', exact: true }).last().click();
  });

  test('imports valid backup data', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    await page.getByLabel('Paste JSON backup data').fill(
      JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        miners: [
          {
            id: 'imported-1',
            name: 'Imported Miner',
            ip: '10.0.0.1',
            port: 80,
            isOnline: false,
            group: '',
            lastSeen: Date.now(),
          },
        ],
        snapshots: [],
        wallets: [
          {
            id: 'imported-wallet-1',
            name: 'Imported Wallet',
            address: 'bc1q...',
            color: '#FF6B35',
            createdAt: Date.now(),
          },
        ],
        settings: { power_cost: '0.15' },
      }),
    );
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.complete');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Import data', exact: true }).last().click();
  });

  test('imports data without error for valid JSON', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: 'Import data', exact: true }).click({ timeout: 15000 });
    await page.getByLabel('Paste JSON backup data').fill(
      JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        miners: [
          {
            id: 'm1',
            name: 'Imported M1',
            ip: '10.0.0.1',
            port: 80,
            isOnline: false,
            group: '',
            lastSeen: Date.now(),
          },
        ],
        snapshots: [],
        wallets: [
          {
            id: 'w1',
            name: 'Imported Wallet',
            address: 'bc1q...',
            color: '#FF6B35',
            createdAt: Date.now(),
          },
        ],
        settings: { power_cost: '0.15' },
      }),
    );
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('import.complete');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Import data', exact: true }).last().click();
    await page.waitForTimeout(1000);
    await expect(page.getByLabel('Paste JSON backup data')).toBeVisible({ timeout: 5000 });
  });
});
