import { Page } from '@playwright/test';

export async function seedLocalStorage(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const miners = [
    {
      id: 'miner-1',
      name: 'Miner Alpha',
      ip: '192.168.1.100',
      port: 80,
      isOnline: true,
      group: 'Living Room',
      lastSeen: Date.now(),
      status: {
        hashRate: 1.2,
        hashRateUnit: 'TH/s',
        temperature: 65,
        vrTemp: 55,
        voltage: 5.1,
        current: 1200,
        power: 12.5,
        sharesAccepted: 1500,
        sharesRejected: 3,
        bestDiff: '1.2M',
        bestSessionDiff: '850K',
        uptimeSeconds: 86400,
        coreVoltage: 850,
        frequency: 450,
        fanSpeed: 80,
        fanRpm: 3600,
        pool: 'stratum+tcp://pool.example.com',
        poolPort: 3333,
        poolUser: 'miner1',
        poolResponseTime: 45,
      },
    },
    {
      id: 'miner-2',
      name: 'Miner Beta',
      ip: '192.168.1.101',
      port: 80,
      isOnline: false,
      group: 'Garage',
      lastSeen: Date.now() - 3600000,
    },
  ];

  await page.evaluate((data) => {
    localStorage.setItem('hashwatch_miners', JSON.stringify(data));
    localStorage.setItem(
      'hashwatch_settings',
      JSON.stringify({
        theme_mode: 'dark',
        auto_scan: 'false',
        power_cost: '0.12',
        onboarding_complete: 'true',
        last_seen_version: '1.1.0',
      }),
    );
    localStorage.setItem(
      'hashwatch_wallets',
      JSON.stringify([
        {
          id: 'wallet-1',
          name: 'Main Wallet',
          address: 'bc1q...',
          color: '#6C63FF',
          createdAt: Date.now(),
        },
      ]),
    );
  }, miners);

  await page.reload();
  await page.waitForLoadState('networkidle');
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'hashwatch_settings',
      JSON.stringify({ onboarding_complete: 'true', last_seen_version: '1.1.0' }),
    );
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
}

export async function skipOnboarding(page: Page): Promise<void> {
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
}
