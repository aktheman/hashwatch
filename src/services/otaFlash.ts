import axios from 'axios';
import { Miner } from '../types';

export interface FlashResult {
  minerId: string;
  success: boolean;
  error?: string;
}

export async function flashMinerOTA(
  miner: Miner,
  firmwareUrl: string,
  signal?: AbortSignal,
): Promise<FlashResult> {
  try {
    const url = `http://${miner.ip}:${miner.port}/api/flash`;
    const response = await axios.post(
      url,
      {
        url: firmwareUrl,
      },
      {
        timeout: 120000,
        signal,
      },
    );
    return {
      minerId: miner.id,
      success: response.status === 200,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      minerId: miner.id,
      success: false,
      error: msg,
    };
  }
}

export async function batchFlashOTA(
  miners: Miner[],
  firmwareUrl: string,
  onProgress: (completed: number, total: number, current: string) => void,
  signal?: AbortSignal,
): Promise<FlashResult[]> {
  const results: FlashResult[] = [];
  const total = miners.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;
    onProgress(i, total, miners[i].name || miners[i].ip);
    const result = await flashMinerOTA(miners[i], firmwareUrl, signal);
    results.push(result);
  }

  onProgress(total, total, 'Complete');
  return results;
}
