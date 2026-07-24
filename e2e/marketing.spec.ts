import { test, expect } from '@playwright/test';

test('landing page loads with correct title', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await expect(page).toHaveTitle(/HashWatch/);
});

test('landing page has Launch Dashboard button', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await expect(page.getByText('Launch Dashboard').first()).toBeVisible({ timeout: 15000 });
});

test('pricing page loads', async ({ page }) => {
  await page.goto('http://localhost:4173/pricing');
  await expect(page.getByText('Simple Pricing').first()).toBeVisible({ timeout: 15000 });
});

test('changelog page loads', async ({ page }) => {
  await page.goto('http://localhost:4173/changelog');
  await expect(page.getByText('Changelog').first()).toBeVisible({ timeout: 15000 });
});

test('terms page loads', async ({ page }) => {
  await page.goto('http://localhost:4173/terms');
  await expect(page.getByText('Terms').first()).toBeVisible({ timeout: 15000 });
});

test('privacy page loads', async ({ page }) => {
  await page.goto('http://localhost:4173/privacy');
  await expect(page.getByText('Privacy').first()).toBeVisible({ timeout: 15000 });
});
