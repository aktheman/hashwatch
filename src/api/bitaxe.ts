import axios, { AxiosInstance } from 'axios';
import { MinerInfo, MinerStatus } from '../types';

const TIMEOUT = 5000;

export class BitAxeClient {
  private ip: string;
  private port: number;
  private client: AxiosInstance;

  constructor(ip: string, port: number = 80) {
    this.ip = ip;
    this.port = port;
    this.client = axios.create({
      baseURL: `http://${ip}:${port}`,
      timeout: TIMEOUT,
      headers: { 'Connection': 'close' },
    });
  }

  async getSystemInfo(): Promise<MinerInfo> {
    const res = await this.client.get('/api/system/info');
    const d = res.data;
    return {
      version: d.version,
      chipType: d.chipType,
      hostname: d.hostname || `bitaxe-${d.macAddr?.slice(-4) || 'unknown'}`,
      macAddr: d.macAddr || '00:00:00:00:00:00',
      ip: this.ip,
      ssid: d.wifi?.ssid || d.ssid,
      wifiSignal: d.wifi?.signal ?? d.wifiStatus?.signal,
      powerMode: d.powerMode ?? d.powerMode,
    };
  }

  async getMinerStatus(): Promise<MinerStatus> {
    const res = await this.client.get('/api/system/status');
    const d = res.data;
    return {
      hashRate: d.hashRate ?? 0,
      hashRateUnit: d.hashRateUnit || 'MH/s',
      temperature: d.temperature ?? 0,
      voltage: d.voltage ?? 0,
      current: d.current ?? 0,
      power: d.power ?? 0,
      sharesAccepted: d.sharesAccepted ?? 0,
      sharesRejected: d.sharesRejected ?? 0,
      bestDiff: d.bestDiff || '0',
      bestSessionDiff: d.bestSessionDiff || '0',
      uptimeSeconds: d.uptimeSeconds ?? 0,
      coreVoltage: d.coreVoltage ?? 0,
      frequency: d.frequency ?? 0,
      fanSpeed: d.fanSpeed ?? 0,
      pool: d.pool || '',
      poolUser: d.poolUser || '',
    };
  }

  async fetchAll(): Promise<{ info: MinerInfo; status: MinerStatus }> {
    const [info, status] = await Promise.all([
      this.getSystemInfo(),
      this.getMinerStatus(),
    ]);
    return { info, status };
  }

  static async probe(ip: string, port: number = 80): Promise<boolean> {
    try {
      const client = new BitAxeClient(ip, port);
      await client.getSystemInfo();
      return true;
    } catch {
      return false;
    }
  }
}
