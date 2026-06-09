import * as Network from 'expo-network';
import { BitAxeClient } from '../api/bitaxe';

export interface DiscoveredMiner {
  ip: string;
  port: number;
}

function generateIPRange(baseIP: string): string[] {
  const parts = baseIP.split('.');
  if (parts.length !== 4) return [];
  const subnet = parts.slice(0, 3).join('.');
  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    ips.push(`${subnet}.${i}`);
  }
  return ips;
}

export async function getLocalSubnet(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && ip.includes('.')) return ip;
    return null;
  } catch {
    return null;
  }
}

export async function scanNetwork(
  onProgress?: (found: number, scanned: number, total: number) => void
): Promise<DiscoveredMiner[]> {
  const myIP = await getLocalSubnet();
  if (!myIP) return [];

  const ips = generateIPRange(myIP);
  const found: DiscoveredMiner[] = [];
  const CONCURRENCY = 20;

  for (let i = 0; i < ips.length; i += CONCURRENCY) {
    const batch = ips.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (ip) => {
        const isBitAxe = await BitAxeClient.probe(ip);
        return isBitAxe ? { ip, port: 80 } : null;
      })
    );
    for (const r of results) {
      if (r) found.push(r);
    }
    onProgress?.(found.length, Math.min(i + CONCURRENCY, ips.length), ips.length);
  }

  return found;
}
