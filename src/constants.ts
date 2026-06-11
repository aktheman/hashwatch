import Constants from 'expo-constants';

interface Extra {
  apiUrl: string;
  revenuecatIosKey: string;
  revenuecatAndroidKey: string;
}

export function getExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}
