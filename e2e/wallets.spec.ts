import { test, expect } from '@playwright/test';
import { seedLocalStorage, skipOnboarding } from './helpers';

test.describe('Wallets Screen', () => {
  test('navigates to Wallets from Settings', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('Wallets').last()).toBeVisible({ timeout: 10000 });
  });

  test('shows seeded wallet', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('Main Wallet').last()).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no wallets', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('No Wallets').first()).toBeVisible({ timeout: 10000 });
  });

  test('opens add wallet modal from empty state', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('No Wallets').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Create Wallet' }).click();
    await expect(page.getByLabel('Wallet name input')).toBeVisible({ timeout: 10000 });
  });

  test('opens add wallet modal from footer', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await expect(page.getByText('Main Wallet').last()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    await expect(page.getByText(/Add Wallet|addWallet\.title|wallet\.add/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('cancel closes add wallet modal', async ({ page }) => {
    await skipOnboarding(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await page.getByRole('button', { name: 'Create Wallet' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 5000 });
    await expect(page.getByText('No Wallets').first()).toBeVisible({ timeout: 10000 });
  });

  test('wallet name input is editable', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    const nameInput = page.getByLabel('Wallet name input');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('My New Wallet');
    await expect(nameInput).toHaveValue('My New Wallet');
  });

  test('wallet address input is editable', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    const addressInput = page.getByLabel('Bitcoin address input');
    await expect(addressInput).toBeVisible({ timeout: 10000 });
    await addressInput.fill('bc1q...');
    await expect(addressInput).toHaveValue('bc1q...');
  });

  test('color selector is visible in add modal', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    const colorSelectors = page.getByLabel('Select color');
    await expect(colorSelectors.first()).toBeVisible({ timeout: 10000 });
  });

  test('save button is visible in add modal', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    await page.getByRole('button', { name: 'Add Wallet' }).click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10000 });
  });

  test('edit button visible on seeded wallet', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    const editBtn = page.getByRole('button', { name: /edit.*wallet|wallet.*edit/i });
    await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('delete button visible on seeded wallet', async ({ page }) => {
    await seedLocalStorage(page);
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click({ force: true });
    await page.getByText('Wallets').last().click({ force: true });
    const deleteBtn = page.getByRole('button', { name: /delete.*wallet|wallet.*delete/i });
    await expect(deleteBtn.first()).toBeVisible({ timeout: 10000 });
  });
});
