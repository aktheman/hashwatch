import axios from 'axios';
import { Miner } from '../types';

export interface DashCapabilities {
  supportsDash: boolean;
  supportsAsicBoost: boolean;
  maxFrequency: number;
  chipType: string;
}

export function detectCapabilities(miner: Miner): DashCapabilities {
  const info = miner.info;
  const hostname = (info?.hostname || '').toLowerCase();
  const version = (info?.version || '').toLowerCase();

  const asicBoostModels = ['bm1366', 'bm1368', 'bm1370'];
  const chipType = info?.chipType || 'unknown';

  return {
    supportsDash: version.includes('dash') || hostname.includes('dash'),
    supportsAsicBoost: asicBoostModels.some((m) => chipType.toLowerCase().includes(m)),
    maxFrequency: chipType.includes('bm1366') ? 650 : chipType.includes('bm1368') ? 625 : 550,
    chipType,
  };
}

export async function toggleAsicBoost(miner: Miner, enable: boolean): Promise<boolean> {
  try {
    const url = `http://${miner.ip}:${miner.port}/api/system`;
    await axios.post(url, { asicBoost: enable }, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function getDashFirmwareUrl(currentVersion: string, chipType: string): string | null {
  if (chipType.includes('bm1366'))
    return 'https://github.com/fixed-dash/bitaxe-dash/releases/latest/download/bitaxe-dash-bm1366.bin';
  if (chipType.includes('bm1368'))
    return 'https://github.com/fixed-dash/bitaxe-dash/releases/latest/download/bitaxe-dash-bm1368.bin';
  return null;
}
