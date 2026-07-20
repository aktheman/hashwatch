import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getExtra } from '../constants';
import {
  MinerSnapshot,
  RemoteMiner,
  SettingsResponse,
  ReceiptValidationResponse,
  DeleteResponse,
  OkResponse,
  GroupShare,
} from '../types';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 60000;

function getCacheKey(config: { method?: string; url?: string; params?: unknown }): string {
  return `${config.method || 'get'}:${config.url || ''}:${JSON.stringify(config.params)}`;
}

function getFromCache(key: string): AxiosResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return { data: entry.data, status: 200, statusText: 'OK (cached)' } as AxiosResponse;
}

function setCache(key: string, data: unknown, ttl: number = DEFAULT_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache() {
  cache.clear();
}

let _getToken: () => string | null = () => null;
let _onUnauthorized: () => void = () => {};
let _baseUrl: string = getExtra().apiUrl;

export function configureClient(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
  baseUrl?: string;
}) {
  _getToken = opts.getToken;
  _onUnauthorized = opts.onUnauthorized;
  if (opts.baseUrl) {
    _baseUrl = opts.baseUrl;
    client.defaults.baseURL = _baseUrl;
  }
}

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setBaseUrl(url: string) {
  _baseUrl = url;
  client.defaults.baseURL = _baseUrl;
}

export const BASE_URL = getExtra().apiUrl;

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export { client as apiClient };

client.interceptors.request.use((config) => {
  const token = _getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => {
    if (res.config.method === 'get') {
      setCache(getCacheKey(res.config), res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && err.config?.baseURL === _baseUrl) {
      _onUnauthorized();
    }
    if (!err.response && err.config?.method === 'get') {
      const cached = getFromCache(getCacheKey(err.config));
      if (cached) {
        return Promise.resolve(cached);
      }
    }
    return Promise.reject(err);
  },
);

export interface AuthResponse {
  token: string;
  userId: string;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>('/api/auth/register', { email, password });
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>('/api/auth/login', { email, password });
  return res.data;
}

export async function fetchMiners(): Promise<RemoteMiner[]> {
  const res = await client.get<RemoteMiner[]>('/api/miners');
  return res.data;
}

export async function createMiner(data: {
  name: string;
  ip: string;
  port?: number;
}): Promise<RemoteMiner> {
  const res = await client.post<RemoteMiner>('/api/miners', data);
  return res.data;
}

export async function deleteMinerAPI(id: string): Promise<DeleteResponse> {
  const res = await client.delete<DeleteResponse>(`/api/miners/${id}`);
  return res.data;
}

export async function fetchStats(minerId: string): Promise<MinerSnapshot[]> {
  const res = await client.get<MinerSnapshot[]>(`/api/stats/${minerId}`);
  return res.data;
}

export async function pushStats(minerId: string, stats: MinerSnapshot): Promise<MinerSnapshot> {
  const res = await client.post<MinerSnapshot>(`/api/stats/${minerId}`, stats);
  return res.data;
}

export async function updateMinerAPI(
  id: string,
  data: { name?: string; ip?: string; port?: number },
): Promise<RemoteMiner> {
  const res = await client.put<RemoteMiner>(`/api/miners/${id}`, data);
  return res.data;
}

export async function getSettings(): Promise<SettingsResponse> {
  const res = await client.get<SettingsResponse>('/api/settings');
  return res.data;
}

export async function putSetting(key: string, value: string): Promise<OkResponse> {
  const res = await client.put<OkResponse>('/api/settings', { key, value });
  return res.data;
}

export async function deleteSetting(key: string): Promise<DeleteResponse> {
  const res = await client.delete<DeleteResponse>(`/api/settings/${key}`);
  return res.data;
}

export async function validateReceipt(
  receipt: string,
  productId: string,
): Promise<ReceiptValidationResponse> {
  const res = await client.post<ReceiptValidationResponse>('/api/receipt/validate', {
    receipt,
    productId,
  });
  return res.data;
}

export async function getNotificationPrefs(minerId: string): Promise<Record<string, boolean>> {
  const res = await client.get<Record<string, boolean>>(`/api/notification-prefs/${minerId}`);
  return res.data;
}

export async function setNotificationPref(
  minerId: string,
  alertType: string,
  enabled: boolean,
): Promise<OkResponse> {
  const res = await client.put<OkResponse>(`/api/notification-prefs/${minerId}`, {
    alertType,
    enabled,
  });
  return res.data;
}

export interface PoolChangeEntry {
  previouspool: string;
  newpool: string;
  changedat: number;
}

export async function fetchPoolChanges(
  minerId: string,
  limit?: number,
): Promise<PoolChangeEntry[]> {
  const res = await client.get<PoolChangeEntry[]>(`/api/pool-changes/${minerId}`, {
    params: { limit },
  });
  return res.data;
}

export async function recordPoolChange(
  minerId: string,
  previousPool: string,
  newPool: string,
  changedAt?: number,
): Promise<OkResponse> {
  const res = await client.post<OkResponse>('/api/pool-changes', {
    minerId,
    previousPool,
    newPool,
    changedAt,
  });
  return res.data;
}

export interface AlertHistoryItem {
  id: number;
  minerid: string;
  eventtype: string;
  title: string;
  timestamp: number;
  read: boolean;
}

export async function fetchAlertHistory(
  limit?: number,
  offset?: number,
): Promise<AlertHistoryItem[]> {
  const res = await client.get<AlertHistoryItem[]>('/api/alert-history', {
    params: { limit, offset },
  });
  return res.data;
}

export async function syncAlertsToBackend(
  alerts: { minerId: string; eventType: string; title: string; timestamp: number; read: boolean }[],
): Promise<{ ok: boolean; inserted: number }> {
  const res = await client.post<{ ok: boolean; inserted: number }>('/api/alert-history/sync', {
    alerts,
  });
  return res.data;
}

export async function markAlertRead(id: number): Promise<OkResponse> {
  const res = await client.put<OkResponse>(`/api/alert-history/${id}/read`);
  return res.data;
}

export interface MinerNoteItem {
  id: number;
  minerid: string;
  text: string;
  createdat: string;
}

export async function fetchMinerNotes(minerId: string): Promise<MinerNoteItem[]> {
  const res = await client.get<MinerNoteItem[]>(`/api/miners/${minerId}/notes`);
  return res.data;
}

export async function addMinerNote(minerId: string, text: string): Promise<MinerNoteItem> {
  const res = await client.post<MinerNoteItem>(`/api/miners/${minerId}/notes`, {
    text,
  });
  return res.data;
}

export async function updateMinerNote(
  minerId: string,
  noteId: number,
  text: string,
): Promise<MinerNoteItem> {
  const res = await client.put<MinerNoteItem>(`/api/miners/${minerId}/notes/${noteId}`, { text });
  return res.data;
}

export async function deleteMinerNote(
  minerId: string,
  noteId: number,
): Promise<{ deleted: boolean }> {
  const res = await client.delete<{ deleted: boolean }>(`/api/miners/${minerId}/notes/${noteId}`);
  return res.data;
}

export interface MinerAlertRule {
  enabled: boolean;
  tempThreshold: number;
  hashrateDropPercent: number;
  offlineReminderMinutes: number;
  uptimeThresholdHours: number;
}

export async function fetchMinerAlertRules(minerId: string): Promise<MinerAlertRule> {
  const res = await client.get<MinerAlertRule>(`/api/miner-alert-rules/${minerId}`);
  return res.data;
}

export interface NotificationHistoryItem {
  id: number;
  token: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sentat: number;
  status: string;
}

export async function fetchNotificationHistory(
  limit?: number,
  offset?: number,
): Promise<NotificationHistoryItem[]> {
  const res = await client.get<NotificationHistoryItem[]>('/api/notification-history', {
    params: { limit, offset },
  });
  return res.data;
}

export async function syncNotificationHistory(
  entries: {
    title: string;
    body?: string;
    token?: string;
    data?: Record<string, unknown>;
    sentAt: number;
    status?: string;
  }[],
): Promise<{ ok: boolean; inserted: number }> {
  const res = await client.post<{ ok: boolean; inserted: number }>(
    '/api/notification-history/sync',
    { entries },
  );
  return res.data;
}

export async function clearNotificationHistory(): Promise<OkResponse> {
  const res = await client.delete<OkResponse>('/api/notification-history');
  return res.data;
}

export async function putMinerAlertRules(
  minerId: string,
  rules: MinerAlertRule,
): Promise<OkResponse> {
  const res = await client.put<OkResponse>(`/api/miner-alert-rules/${minerId}`, rules);
  return res.data;
}

export interface PoolConfig {
  id: number;
  provider: string;
  apiKey: string;
  poolUser: string;
  enabled: boolean;
}

export interface PoolAnalyticsStats {
  provider: string;
  hashrate: number;
  hashrateUnit: string;
  btcEarned: number;
  usdEarned: number;
  luck: number;
  activeWorkers: number;
  lastUpdated: number;
}

export async function fetchPoolAnalytics(): Promise<{
  stats: PoolAnalyticsStats[];
  configs: PoolConfig[];
}> {
  const res = await client.get<{ stats: PoolAnalyticsStats[]; configs: PoolConfig[] }>(
    '/api/pool-analytics',
  );
  return res.data;
}

export async function savePoolConfig(config: {
  provider: string;
  apiKey: string;
  poolUser: string;
}): Promise<PoolConfig> {
  const res = await client.post<PoolConfig>('/api/pool-analytics/config', config);
  return res.data;
}

export async function fetchPoolConfigs(): Promise<PoolConfig[]> {
  const res = await client.get<PoolConfig[]>('/api/pool-analytics/config');
  return res.data;
}

export async function shareGroup(
  groupId: string,
  email: string,
  accessLevel: string,
): Promise<{ id: number; accessLevel: string; updated?: boolean }> {
  const res = await client.post<{ id: number; accessLevel: string; updated?: boolean }>(
    '/api/groups/share',
    { groupId, email, accessLevel },
  );
  return res.data;
}

export async function listSharedWithMe(): Promise<GroupShare[]> {
  const res = await client.get<GroupShare[]>('/api/groups/share');
  return res.data;
}

export async function listSharedByMe(): Promise<GroupShare[]> {
  const res = await client.get<GroupShare[]>('/api/groups/shared-by-me');
  return res.data;
}

export async function updateShareAccess(
  shareId: number,
  accessLevel: string,
): Promise<{ id: number; accessLevel: string }> {
  const res = await client.put<{ id: number; accessLevel: string }>(
    `/api/groups/share/${shareId}`,
    { accessLevel },
  );
  return res.data;
}

export async function revokeShare(shareId: number): Promise<{ deleted: boolean }> {
  const res = await client.delete<{ deleted: boolean }>(`/api/groups/share/${shareId}`);
  return res.data;
}

export async function fetchSharedGroupMiners(
  groupId: string,
): Promise<{ miners: RemoteMiner[]; accessLevel: string }> {
  const res = await client.get<{ miners: RemoteMiner[]; accessLevel: string }>(
    `/api/groups/shared-miners/${groupId}`,
  );
  return res.data;
}

export interface DarkPoolContribution {
  id: number;
  minerHashrate: number;
  minerPower: number;
  minerTemp: number | null;
  poolName: string | null;
  region: string | null;
  contributedAt: string;
}

export interface DarkPoolAggregate {
  totalHashrate: number;
  avgPower: number;
  avgTemp: number;
  contributorCount: number;
  poolBreakdown: Record<string, number>;
  regionBreakdown: Record<string, number>;
  period: string;
}

export async function contributeDarkPool(data: {
  hashrate: number;
  power: number;
  temp?: number;
  poolName?: string;
  region?: string;
}): Promise<{ ok: boolean; id: number }> {
  const res = await client.post<{ ok: boolean; id: number }>('/api/darkpool/contribute', data);
  return res.data;
}

export async function getDarkPoolAggregate(period: string): Promise<DarkPoolAggregate> {
  const res = await client.get<DarkPoolAggregate>('/api/darkpool/aggregate', {
    params: { period },
  });
  return res.data;
}

export async function getDarkPoolMyContributions(): Promise<DarkPoolContribution[]> {
  const res = await client.get<DarkPoolContribution[]>('/api/darkpool/my-contributions');
  return res.data;
}

export async function deleteDarkPoolMyContributions(): Promise<{ ok: boolean; deleted: number }> {
  const res = await client.delete<{ ok: boolean; deleted: number }>(
    '/api/darkpool/my-contributions',
  );
  return res.data;
}

// ── Public Dashboards ──────────────────────────────────────────────────────

export async function createPublicDashboard(
  minerId: string,
): Promise<{ token: string; createdAt: number }> {
  const res = await client.post<{ token: string; createdAt: number }>('/api/public-dashboards', {
    minerId,
  });
  return res.data;
}

export async function getPublicDashboard(token: string): Promise<{
  minerName: string;
  minerId: string;
  snapshot: MinerSnapshot | null;
  createdAt: number;
}> {
  const res = await client.get<{
    minerName: string;
    minerId: string;
    snapshot: MinerSnapshot | null;
    createdAt: number;
  }>(`/api/public-dashboards/${token}`);
  return res.data;
}

export async function revokePublicDashboard(token: string): Promise<{ deleted: boolean }> {
  const res = await client.delete<{ deleted: boolean }>(`/api/public-dashboards/${token}`);
  return res.data;
}

// ── Marketplace ────────────────────────────────────────────────────────────

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  model: string;
  condition: string;
  location: string;
  sellerId: string;
  createdAt: number;
}

export async function fetchMarketplaceListings(
  page?: number,
  limit?: number,
): Promise<{ listings: MarketplaceListing[]; total: number; page: number; limit: number }> {
  const res = await client.get<{
    listings: MarketplaceListing[];
    total: number;
    page: number;
    limit: number;
  }>('/api/marketplace', { params: { page, limit } });
  return res.data;
}

export async function fetchMyListings(): Promise<MarketplaceListing[]> {
  const res = await client.get<MarketplaceListing[]>('/api/marketplace/mine');
  return res.data;
}

export async function createMarketplaceListing(data: {
  title: string;
  description: string;
  price: number;
  currency: string;
  model: string;
  condition: string;
  location: string;
}): Promise<MarketplaceListing> {
  const res = await client.post<MarketplaceListing>('/api/marketplace', data);
  return res.data;
}

export async function deleteMarketplaceListing(id: string): Promise<{ deleted: boolean }> {
  const res = await client.delete<{ deleted: boolean }>(`/api/marketplace/${id}`);
  return res.data;
}
