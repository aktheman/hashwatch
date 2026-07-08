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
});
