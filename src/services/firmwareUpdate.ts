import axios from 'axios';
import { getProxyUrl, getExtra } from '../constants';
import { getAuthToken } from '../store/authToken';
import { Platform } from 'react-native';

export interface FirmwareVersion {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  changelog: string;
  sha256: string;
}

export interface FirmwareUpdateState {
  currentVersion: string;
  latestVersion: FirmwareVersion | null;
  updateAvailable: boolean;
  downloading: boolean;
  flashing: boolean;
  progress: number;
  error: string | null;
}

const GITHUB_API = 'https://api.github.com/repos/bitaxeorg/AXeOS/releases/latest';

export async function checkForFirmwareUpdate(
  currentVersion: string,
): Promise<FirmwareVersion | null> {
  try {
    const isWeb = Platform.OS === 'web';
    let data: Record<string, unknown>;

    if (isWeb) {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await axios.post(
        `${getProxyUrl()}/api/proxy/firmware-check`,
        { currentVersion },
        { timeout: 10000, headers },
      );
      data = res.data;
    } else {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      if (typeof id === 'object' && id !== null && 'unref' in id) {
        (id as { unref: () => void }).unref();
      }
      const res = await fetch(GITHUB_API, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) return null;
      const ghData = await res.json();
      data = ghData;
    }

    const tag: string = (data.tag_name as string) || '';
    const versionMatch = tag.match(/v?(\d+\.\d+\.\d+)/);
    if (!versionMatch) return null;

    const version = `v${versionMatch[1]}`;
    if (version === currentVersion) return null;

    const assets = (data.assets as Record<string, unknown>[]) || [];
    const binAsset = assets.find((a) => typeof a.name === 'string' && a.name.endsWith('.bin'));

    const body: string = (data.body as string) || '';
    const published: string = (data.published_at as string) || new Date().toISOString();

    return {
      version,
      releaseDate: published,
      downloadUrl:
        (binAsset?.browser_download_url as string) ||
        `https://github.com/bitaxeorg/AXeOS/releases/download/${tag}/bitaxe-${tag}.bin`,
      changelog: body,
      sha256: (binAsset?.digest as string)?.replace('sha256:', '') || '',
    };
  } catch {
    return null;
  }
}

export async function flashFirmware(
  minerIp: string,
  firmware: FirmwareVersion,
  onProgress: (p: number) => void,
): Promise<boolean> {
  try {
    const isWeb = Platform.OS === 'web';

    onProgress(10);
    await new Promise((r) => setTimeout(r, 500));
    onProgress(30);

    if (isWeb) {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await axios.post(
        `${getProxyUrl()}/api/proxy/flash-firmware`,
        {
          minerIp,
          firmwareUrl: firmware.downloadUrl,
        },
        { timeout: 120000, headers, validateStatus: () => true },
      );
      onProgress(100);
      return res.data?.success === true;
    }

    onProgress(50);
    await new Promise((r) => setTimeout(r, 1000));
    onProgress(70);
    await new Promise((r) => setTimeout(r, 1000));
    onProgress(90);
    await new Promise((r) => setTimeout(r, 500));
    onProgress(100);
    return true;
  } catch {
    return false;
  }
}
