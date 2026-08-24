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
    await expect(
      page.getByText('Monitor Your BitAxe').filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    const next = page.getByRole('button', { name: 'Next' }).filter({ visible: true }).first();
    // Slides 1-3 advance directly; slide 4 is interactive and requires running the scan
    for (let i = 0; i < 3; i++) {
      await next.click({ timeout: 5000 });
      await page.waitForTimeout(300);
    }
    await page
      .getByRole('button', { name: /scan network/i })
      .filter({ visible: true })
      .first()
      .click({ timeout: 5000 });
    await page.waitForTimeout(2500);
    await next.click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const getStarted = page
      .getByRole('button', { name: /get started/i })
      .filter({ visible: true })
      .first();
    await expect(getStarted).toBeVisible({ timeout: 10000 });
    await getStarted.click({ force: true });
    await expect(page.getByText('HashWatch').first()).toBeVisible({ timeout: 15000 });
  });
});
