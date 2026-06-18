import { test, expect } from '@playwright/test';

test.describe('Web dashboard smoke tests', () => {
  test('page loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('app renders without blank screen', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('expo bundle loads', async ({ page }) => {
    await page.goto('/');
    const scripts = page.locator('script[src]');
    const count = await scripts.count();
    expect(count).toBeGreaterThan(0);
  });
});
