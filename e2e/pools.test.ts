import { test, expect } from '@playwright/test';

test('pools page loads', async ({ page }) => {
  await page.goto('/pools');
  await expect(page.locator('text=Pool').first()).toBeVisible({ timeout: 10000 });
});
