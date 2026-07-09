import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { MinerInfo, MinerStatus, HashRateUnit } from '../types';
import { getProxyUrl, getExtra } from '../constants';
import { getAuthToken } from '../store/authToken';

const TIMEOUT = 5000;
const PROBE_TIMEOUT = 3000;
const isWeb = Platform.OS === 'web';

function formatIp(ip: string): string {
  return ip.includes(':') ? `[${ip}]` : ip;
}

const INFO_PATHS = ['/api/system/info', '/api/info', '/system/info', '/api/miner/getall'];

const STATUS_PATHS = ['/api/system/status', '/api/status', '/system/status', '/api/miner/getall'];

function isBitAxeResponse(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return !!(
    data?.hostname ||
    data?.macAddr ||
    data?.chipType ||
    data?.hashRate !== undefined ||
    data?.hashrate !== undefined
  );
}

function isStatusResponse(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return (
    data?.hashRate !== undefined ||
    data?.hashrate !== undefined ||
    data?.sharesAccepted !== undefined ||
    data?.sharesRejected !== undefined ||
    data?.temperature !== undefined
  );
}

async function fetchUrl(
  url: string,
  timeout = PROBE_TIMEOUT,
): Promise<Record<string, unknown> | null> {
  try {
    if (isWeb) {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const { data } = await axios.post(
        `${getProxyUrl()}/api/proxy`,
        { url, method: 'GET' },
        { timeout, validateStatus: () => true, headers },
      );
      return data;
    }
    const { data } = await axios.get(url, { timeout, validateStatus: () => true });
    return data;
  } catch {
    return null;
  }
}

export interface FoundPaths {
  infoPath: string | null;
  statusPath: string | null;
}

async function findPaths(ip: string, port: number): Promise<FoundPaths> {
  const base = `http://${formatIp(ip)}:${port}`;
  const infoUrls = INFO_PATHS.map((path) => `${base}${path}`);
  const infoResults = await Promise.all(infoUrls.map((url) => fetchUrl(url)));

  for (let i = 0; i < infoResults.length; i++) {
    if (infoResults[i] && isBitAxeResponse(infoResults[i])) {
      const infoPath = INFO_PATHS[i];

      const derived = infoPath.replace(/\/info$/, '/status');
      const data = derived !== infoPath ? await fetchUrl(`${base}${derived}`) : null;
      if (data && isStatusResponse(data)) {
        return { infoPath, statusPath: derived };
      }

      const statusUrls = STATUS_PATHS.map((p) => `${base}${p}`);
      const statusResults = await Promise.all(statusUrls.map((url) => fetchUrl(url)));
      for (let j = 0; j < statusResults.length; j++) {
        if (isStatusResponse(statusResults[j])) {
          return { infoPath, statusPath: STATUS_PATHS[j] };
        }
      }

      return { infoPath, statusPath: null };
    }
  }

  return { infoPath: null, statusPath: null };
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
      baseURL: `http://${formatIp(ip)}:${port}`,
      timeout: TIMEOUT,
    });
  }

  private async proxyGet(path: string): Promise<Record<string, unknown>> {
    try {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const { data } = await axios.post(
        `${getProxyUrl()}/api/proxy`,
        {
          url: `http://${formatIp(this.ip)}:${this.port}${path}`,
          method: 'GET',
        },
        { timeout: TIMEOUT + 3000, headers },
      );
      return data;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Connection failed';
      throw new Error(msg);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async get(path: string): Promise<Record<string, any>> {
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
      powerMode: d.powerMode,
    };
  }

  async getMinerStatus(): Promise<MinerStatus> {
    const d = await this.get(this.statusPath);
    const rawUnit = d.hashRateUnit || 'GH/s';
    const validUnits: HashRateUnit[] = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
    const hashRateUnit: HashRateUnit = validUnits.includes(rawUnit) ? rawUnit : 'GH/s';
    return {
      hashRate: d.hashRate ?? 0,
      hashRateUnit,
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
    const [info, status] = await Promise.all([this.getSystemInfo(), this.getMinerStatus()]);
    return { info, status };
  }

  async restart(): Promise<boolean> {
    try {
      const path = this.apiPath.replace(/\/info$/, '/restart');
      if (isWeb) {
        const headers: Record<string, string> = {};
        const apiUrl = getExtra().apiUrl;
        if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
          const token = getAuthToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const { data } = await axios.post(
          `${getProxyUrl()}/api/proxy/restart`,
          { url: `http://${formatIp(this.ip)}:${this.port}${path}` },
          { timeout: 8000, headers, validateStatus: () => true },
        );
        return data?.success === true;
      }
      await this.client.post(path);
      return true;
    } catch {
      return false;
    }
  }

  async setPool(poolUrl: string, port: number, user: string): Promise<boolean> {
    try {
      const path = '/api/system/updatePool';
      const body = { url: poolUrl, port, user };
      if (isWeb) {
        const headers: Record<string, string> = {};
        const apiUrl = getExtra().apiUrl;
        if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
          const token = getAuthToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const { data } = await axios.post(
          `${getProxyUrl()}/api/proxy/pool`,
          {
            minerUrl: `http://${formatIp(this.ip)}:${this.port}${path}`,
            body,
          },
          { timeout: 10000, headers, validateStatus: () => true },
        );
        return data?.success === true;
      }
      await this.client.post(path, body, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async flashFirmware(url: string): Promise<boolean> {
    try {
      const path = '/api/system/ota';
      if (isWeb) {
        const headers: Record<string, string> = {};
        const apiUrl = getExtra().apiUrl;
        if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
          const token = getAuthToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const { data } = await axios.post(
          `${getProxyUrl()}/api/proxy/flash`,
          {
            url: `http://${formatIp(this.ip)}:${this.port}${path}`,
            method: 'POST',
            body: JSON.stringify({ url }),
          },
          { timeout: 120000, headers, validateStatus: () => true },
        );
        return data?.success === true;
      }
      await this.client.post(path, { url }, { timeout: 120000 });
      return true;
    } catch {
      return false;
    }
  }

  static async probe(ip: string, port: number = 80): Promise<FoundPaths | null> {
    const paths = await findPaths(ip, port);
    if (!paths.infoPath) return null;
    return paths;
  }
}
