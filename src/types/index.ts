export interface MinerInfo {
  version?: string;
  chipType?: string;
  hostname: string;
  macAddr: string;
  ip: string;
  ssid?: string;
  wifiSignal?: number;
  powerMode?: number;
}

export interface MinerStatus {
  hashRate: number;
  hashRateUnit: string;
  temperature: number;
  vrTemp: number;
  voltage: number;
  current: number;
  power: number;
  sharesAccepted: number;
  sharesRejected: number;
  bestDiff: string;
  bestSessionDiff: string;
  uptimeSeconds: number;
  coreVoltage: number;
  frequency: number;
  fanSpeed: number;
  fanRpm: number;
  pool: string;
  poolPort: number;
  poolUser: string;
  poolResponseTime: number;
}

export interface Miner {
  id: string;
  name: string;
  ip: string;
  port: number;
  apiPath?: string;
  statusPath?: string;
  info: MinerInfo | null;
  status: MinerStatus | null;
  lastSeen: number;
  addedAt: number;
  isOnline: boolean;
}

export interface MinerSnapshot {
  minerId: string;
  timestamp: number;
  hashRate: number;
  temperature: number;
  voltage: number;
  current: number;
  power: number;
  sharesAccepted: number;
  sharesRejected: number;
  uptimeSeconds: number;
  frequency: number;
}

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: number | null;
  maxMiners: number;
}
