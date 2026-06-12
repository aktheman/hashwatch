import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { MinerInfo, MinerStatus } from '../types';
import { getProxyUrl, getExtra } from '../constants';
import { useAuthStore } from '../store/auth';

const TIMEOUT = 5000;
const PROBE_TIMEOUT = 3000;
const isWeb = Platform.OS === 'web';

const INFO_PATHS = ['/api/system/info', '/api/info', '/system/info', '/api/miner/getall'];

const STATUS_PATHS = ['/api/system/status', '/api/status', '/system/status', '/api/miner/getall'];

function isBitAxeResponse(data: any): boolean {
  if (!data) return false;
  return !!(
    data?.hostname ||
    data?.macAddr ||
    data?.chipType ||
    data?.hashRate !== undefined ||
    data?.hashrate !== undefined
  );
}

function isStatusResponse(data: any): boolean {
  if (!data) return false;
  return (
    data?.hashRate !== undefined ||
    data?.hashrate !== undefined ||
    data?.sharesAccepted !== undefined ||
    data?.sharesRejected !== undefined ||
    data?.temperature !== undefined
  );
}

async function fetchUrl(url: string, timeout = PROBE_TIMEOUT): Promise<any> {
  try {
    if (isWeb) {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = useAuthStore.getState().token;
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
  const infoUrls = INFO_PATHS.map((path) => `http://${ip}:${port}${path}`);
  const infoResults = await Promise.all(infoUrls.map((url) => fetchUrl(url)));

  for (let i = 0; i < infoResults.length; i++) {
    if (infoResults[i] && isBitAxeResponse(infoResults[i])) {
      const infoPath = INFO_PATHS[i];

      const derived = infoPath.replace(/\/info$/, '/status');
      const data = derived !== infoPath ? await fetchUrl(`http://${ip}:${port}${derived}`) : null;
      if (data && isStatusResponse(data)) {
        return { infoPath, statusPath: derived };
      }

      const statusUrls = STATUS_PATHS.map((p) => `http://${ip}:${port}${p}`);
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
      baseURL: `http://${ip}:${port}`,
      timeout: TIMEOUT,
    });
  }

  private async proxyGet(path: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      const apiUrl = getExtra().apiUrl;
      if (getProxyUrl() === apiUrl || getProxyUrl().startsWith(apiUrl)) {
        const token = useAuthStore.getState().token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const { data } = await axios.post(
        `${getProxyUrl()}/api/proxy`,
        {
          url: `http://${this.ip}:${this.port}${path}`,
          method: 'GET',
        },
        { timeout: TIMEOUT + 3000, headers },
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
      powerMode: d.powerMode,
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
    const [info, status] = await Promise.all([this.getSystemInfo(), this.getMinerStatus()]);
    return { info, status };
  }

  static async probe(ip: string, port: number = 80): Promise<FoundPaths | null> {
    const paths = await findPaths(ip, port);
    if (!paths.infoPath) return null;
    return paths;
  }
}
