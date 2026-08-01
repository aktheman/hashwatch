import { test, expect } from '@playwright/test';

async function openFirmware(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.setItem(
      'hashwatch_settings',
      JSON.stringify({
        onboarding_complete: 'true',
        last_seen_version: '1.1.0',
        auth_token: 'e30.e30.e30',
        auth_email: 'e2e@example.com',
      }),
    );
  });
  await page.route('**/stripe/subscription', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active: true, inTrial: false }),
    }),
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[aria-label="Premium content"]')).toHaveCount(0, { timeout: 15000 });
  await page
    .getByRole('button', { name: /settings/i })
    .first()
    .click();
  await page.getByText('Firmware').first().click();
  await expect(page.getByText('Current Version')).toBeVisible({ timeout: 15000 });
}

test('shows the Current Version section with the built-in version', async ({ page }) => {
  await openFirmware(page);
  await expect(page.getByText('v2.2.1')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Built-in version')).toBeVisible({ timeout: 15000 });
});

test('shows the Check for Updates button', async ({ page }) => {
  await openFirmware(page);
  await expect(page.getByRole('button', { name: 'Check for Updates' })).toBeVisible({
    timeout: 15000,
  });
});
