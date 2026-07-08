import { test, expect } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('pools page loads', async ({ page }) => {
  await skipOnboarding(page);
  await page.getByRole('tab', { name: /pools/i }).click({ timeout: 10000 });
  await expect(page.getByText(/pool/i).last()).toBeVisible({ timeout: 10000 });
});
