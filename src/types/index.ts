export type HashRateUnit = 'H/s' | 'KH/s' | 'MH/s' | 'GH/s' | 'TH/s' | 'PH/s';

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
  hashRateUnit: HashRateUnit;
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

export interface Wallet {
  id: string;
  name: string;
  address: string;
  color: string;
  createdAt: number;
}

export interface Miner {
  id: string;
  name: string;
  ip: string;
  port: number;
  walletId?: string;
  group?: string;
  remoteId?: string;
  apiPath?: string | null;
  statusPath?: string | null;
  info?: MinerInfo | null;
  status?: MinerStatus | null;
  lastSeen?: number;
  addedAt?: number;
  isOnline: boolean;
}

export interface MinerSnapshot {
  minerId: string;
  timestamp: number;
  hashRate: number;
  hashRateUnit?: HashRateUnit;
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

export type RootStackParamList = {
  MainTabs: undefined;
  MinerDetail: { minerId: string };
  AddMiner: undefined;
  Subscription: undefined;
  Wallets: undefined;
  Groups: undefined;
  ImportData: undefined;
  MinerComparison: { minerIds: string[] };
};

export type TabParamList = {
  Dashboard: undefined;
  Pools: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type RemoteMiner = {
  id: string;
  ip: string;
  port?: number;
  name: string;
};

export type WSMessage =
  | { type: 'snapshot'; snapshot: MinerSnapshot }
  | { type: 'auth'; token: string }
  | { type: string; [key: string]: unknown };

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type NavigationProp = NativeStackNavigationProp<RootStackParamList & TabParamList>;

export type APIError = { message: string; response?: { data?: { error?: string } } };

export interface SettingsResponse {
  [key: string]: string;
}

export interface ReceiptValidationResponse {
  valid: boolean;
  expiresDate: string | null;
}

export interface DeleteResponse {
  deleted: boolean;
}

export interface OkResponse {
  ok: boolean;
}
