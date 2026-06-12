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

export const PROXY_URL = getExtra().minerProxyUrl || getExtra().apiUrl || 'http://localhost:4000';
