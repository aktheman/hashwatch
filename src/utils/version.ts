export const LATEST_FIRMWARE = 'v2.2.1';

export function parseVersion(raw: string): string | null {
  const match = raw.match(/v?(\d+\.\d+\.\d+)/);
  return match ? `v${match[1]}` : null;
}

export function needsUpdate(current: string, latest: string = LATEST_FIRMWARE): boolean {
  const strip = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const cur = strip(current);
  const lat = strip(latest);
  for (let i = 0; i < 3; i++) {
    if ((cur[i] ?? 0) < (lat[i] ?? 0)) return true;
    if ((cur[i] ?? 0) > (lat[i] ?? 0)) return false;
  }
  return false;
}

export function getFirmwareUrl(): string {
  return 'https://github.com/skot/bitaxe/releases/latest';
}

export async function fetchLatestFirmware(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.github.com/repos/skot/bitaxe/releases/latest', {
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const data = await res.json();
    const tag: string = data.tag_name || '';
    if (parseVersion(tag)) return parseVersion(tag);
    return null;
  } catch {
    return null;
  }
}

export function getFirmwareChangelogUrl(version: string): string {
  return `https://github.com/skot/bitaxe/releases/tag/${version}`;
}
