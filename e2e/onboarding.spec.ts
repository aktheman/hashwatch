import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test('shows onboarding slides when not completed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Monitor Your BitAxe').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Skip').first()).toBeVisible();
  });

  test('can skip onboarding and reach dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByText('Skip').first().click({ force: true });
    await expect(page.getByText('HashWatch').first()).toBeVisible({ timeout: 15000 });
  });

  test('can navigate slides and reach get started', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    for (let i = 0; i < 3; i++) {
      await page.getByText('Next').first().click({ force: true });
    }
    await expect(page.getByText('Get Started').first()).toBeVisible({ timeout: 10000 });
    await page.getByText('Get Started').first().click({ force: true });
    await expect(page.getByText('HashWatch').first()).toBeVisible({ timeout: 15000 });
  });
});
