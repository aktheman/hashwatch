import Constants from 'expo-constants';

interface Extra {
  apiUrl: string;
  revenuecatIosKey: string;
  revenuecatAndroidKey: string;
  minerProxyUrl?: string;
}

export function getExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

let _proxyUrl = getExtra().minerProxyUrl || getExtra().apiUrl || 'http://localhost:4000';

export function getProxyUrl(): string {
  return _proxyUrl;
}

export async function setProxyUrl(url: string): Promise<void> {
  _proxyUrl = url;
  try {
    const { setSetting } = await import('./db/database');
    await setSetting('proxy_url', url);
  } catch {}
}

export async function initProxyUrl(): Promise<void> {
  try {
    const { getSetting } = await import('./db/database');
    const saved = await getSetting('proxy_url');
    if (saved) {
      _proxyUrl = saved;
    }
  } catch {}
}
