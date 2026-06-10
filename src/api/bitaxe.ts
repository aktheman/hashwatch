import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { MinerInfo, MinerStatus } from '../types';
import * as API from './client';

const TIMEOUT = 5000;
const isWeb = Platform.OS === 'web';

const INFO_PATHS = [
  '/api/system/info',
  '/api/info',
  '/system/info',
];

function isBitAxeResponse(data: any): boolean {
  return !!(data?.hostname || data?.macAddr || data?.chipType || data?.hashRate !== undefined);
}

function deriveStatusPath(infoPath: string): string {
  return infoPath.replace(/\/info$/, '/status');
}

async function fetchUrl(url: string, timeout = 3000): Promise<any> {
  try {
    const { data } = isWeb
      ? await axios.post(`${API.BASE_URL}/api/proxy`, { url, method: 'GET' }, { timeout, validateStatus: () => true })
      : await axios.get(url, { timeout, validateStatus: () => true });
    return data;
  } catch {
    return null;
  }
}

interface FoundPaths {
  infoPath: string | null;
  statusPath: string | null;
}

async function findPaths(ip: string, port: number): Promise<FoundPaths> {
  let infoPath: string | null = null;
  let statusPath: string | null = null;

  for (const path of INFO_PATHS) {
    const url = `http://${ip}:${port}${path}`;
    const data = await fetchUrl(url);
    if (data && isBitAxeResponse(data)) {
      infoPath = path;
      break;
    }
  }

  if (infoPath) {
    const derived = deriveStatusPath(infoPath);
    const statusUrl = `http://${ip}:${port}${derived}`;
    const data = await fetchUrl(statusUrl);
    if (data && (data.hashRate !== undefined || data.sharesAccepted !== undefined)) {
      statusPath = derived;
    }
  }

  return { infoPath, statusPath };
}

export class BitAxeClient {
  private ip: string;
  private port: number;
  private client: AxiosInstance;

  private apiPath: string;
  private statusPath: string;

  constructor(ip: string, port: number = 80, apiPath?: string, statusPath?: string) {
    this.ip = ip;
    this.port = port;
    this.apiPath = apiPath || '/api/system/info';
    this.statusPath = statusPath || this.apiPath;
    this.client = axios.create({
      baseURL: `http://${ip}:${port}`,
      timeout: TIMEOUT,
      headers: { 'Connection': 'close' },
    });
  }

  private async proxyGet(path: string): Promise<any> {
    try {
      const { data } = await axios.post(
        `${API.BASE_URL}/api/proxy`,
        {
          url: `http://${this.ip}:${this.port}${path}`,
          method: 'GET',
        },
        { timeout: TIMEOUT + 3000 }
      );
      return data;
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Connection failed';
      throw new Error(msg);
    }
  }

  private async get(path: string): Promise<any> {
    if (isWeb) {
      return this.proxyGet(path);
    }
    const res = await this.client.get(path);
    return res.data;
  }

  async getSystemInfo(): Promise<MinerInfo> {
    const d = await this.get(this.apiPath);
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
    const d = await this.get(this.statusPath);
    return {
      hashRate: d.hashRate ?? 0,
      hashRateUnit: d.hashRateUnit || 'GH/s',
      temperature: d.temperature ?? d.temp ?? 0,
      vrTemp: d.vrTemp ?? 0,
      voltage: d.voltage ?? 0,
      current: d.current ?? 0,
      power: d.power ?? 0,
      sharesAccepted: d.sharesAccepted ?? 0,
      sharesRejected: d.sharesRejected ?? 0,
      bestDiff: d.bestDiff || '0',
      bestSessionDiff: d.bestSessionDiff || '0',
      uptimeSeconds: d.uptimeSeconds ?? 0,
      coreVoltage: d.coreVoltage ?? d.coreVoltageActual ?? 0,
      frequency: d.frequency ?? d.actualFrequency ?? 0,
      fanSpeed: d.fanSpeed ?? d.fanspeed ?? 0,
      fanRpm: d.fanRpm ?? d.fanrpm ?? 0,
      pool: d.pool || d.stratumURL || '',
      poolPort: d.poolPort ?? d.stratumPort ?? 0,
      poolUser: d.poolUser || d.stratumUser || '',
      poolResponseTime: d.poolResponseTime ?? d.responseTime ?? 0,
    };
  }

  async fetchAll(): Promise<{ info: MinerInfo; status: MinerStatus }> {
    const [info, status] = await Promise.all([
      this.getSystemInfo(),
      this.getMinerStatus(),
    ]);
    return { info, status };
  }

  static async probe(ip: string, port: number = 80): Promise<FoundPaths | null> {
    const paths = await findPaths(ip, port);
    if (!paths.infoPath) return null;
    return paths;
  }
}

export type { FoundPaths };
