import * as API from '../api/client';
import * as DB from '../db/database';
import { Miner } from '../types';

function minerKey(ip: string, port: number): string {
  return `${ip}:${port}`;
}

export async function syncMinersWithBackend(localMiners: Miner[]): Promise<Miner[]> {
  const remoteMiners: any[] = await API.fetchMiners();
  const remoteByKey = new Map(remoteMiners.map((m) => [minerKey(m.ip, m.port ?? 80), m]));
  const updated: Miner[] = [];

  for (const local of localMiners) {
    const key = minerKey(local.ip, local.port);
    const remote = remoteByKey.get(key);

    if (remote) {
      remoteByKey.delete(key);
      if (local.remoteId !== remote.id) {
        const synced = { ...local, remoteId: remote.id };
        await DB.saveMiner(synced);
        updated.push(synced);
      } else {
        updated.push(local);
      }
      continue;
    }

    if (local.remoteId) {
      updated.push(local);
      continue;
    }

    try {
      const created = await API.createMiner({ name: local.name, ip: local.ip, port: local.port });
      const synced = { ...local, remoteId: created.id };
      await DB.saveMiner(synced);
      updated.push(synced);
    } catch {
      updated.push(local);
    }
  }

  return updated;
}

export async function createRemoteMiner(miner: Miner): Promise<string | undefined> {
  try {
    const created = await API.createMiner({ name: miner.name, ip: miner.ip, port: miner.port });
    return created.id;
  } catch {
    return undefined;
  }
}

export async function deleteRemoteMiner(remoteId: string): Promise<void> {
  try {
    await API.deleteMinerAPI(remoteId);
  } catch {
    // ignore — local delete still proceeds
  }
}
