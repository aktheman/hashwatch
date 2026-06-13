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
  onProgress?: (found: number, scanned: number, total: number) => void,
  timeoutMs: number = 120000,
  signal?: AbortSignal,
): Promise<DiscoveredMiner[]> {
  const myIP = await getLocalSubnet();
  if (!myIP) return [];

  const ips = generateIPRange(myIP);
  const found: DiscoveredMiner[] = [];
  const CONCURRENCY = 50;

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);

  let scanned = 0;

  function isAborted(): boolean {
    if (timeoutController.signal.aborted) return true;
    if (signal?.aborted) return true;
    return false;
  }

  async function worker(queue: string[]): Promise<void> {
    while (queue.length > 0 && !isAborted()) {
      const ip = queue.shift()!;
      try {
        const isBitAxe = await BitAxeClient.probe(ip);
        if (isBitAxe) found.push({ ip, port: 80 });
      } catch {
        // timeout or unreachable — skip
      }
      scanned++;
      onProgress?.(found.length, scanned, ips.length);
    }
  }

  try {
    const queue = [...ips];
    const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
    await Promise.all(workers);
  } finally {
    clearTimeout(timeout);
  }

  return found;
}
