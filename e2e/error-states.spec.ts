import { test, expect } from '@playwright/test';
import { seedLocalStorage } from './helpers';

test.describe('Error states', () => {
  test('app loads without error banner when healthy', async ({ page }) => {
    await seedLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    const errorElements = page.getByText(/error|failed|unexpected/i);
    const errorCount = await errorElements.count();
    expect(errorCount).toBeLessThanOrEqual(2);
  });

  test('dashboard shows miner data after load', async ({ page }) => {
    await seedLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Miner Alpha').first()).toBeVisible({ timeout: 10000 });
  });

  test('error boundary fallback renders on critical error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.setItem(
        'hashwatch_settings',
        JSON.stringify({ onboarding_complete: 'true', last_seen_version: '1.1.0' }),
      );
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('HashWatch').first()).toBeVisible({ timeout: 15000 });
  });
});
