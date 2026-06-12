import axios, { AxiosInstance } from 'axios';
import { getExtra } from '../constants';
import { MinerSnapshot, RemoteMiner } from '../types';

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

client.interceptors.request.use((config) => {
  const token = _getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      _onUnauthorized();
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
  const res = await client.get('/api/miners');
  return res.data;
}

export async function createMiner(data: {
  name: string;
  ip: string;
  port?: number;
}): Promise<{ id: string }> {
  const res = await client.post('/api/miners', data);
  return res.data;
}

export async function deleteMinerAPI(id: string) {
  await client.delete(`/api/miners/${id}`);
}

export async function fetchStats(minerId: string) {
  const res = await client.get(`/api/stats/${minerId}`);
  return res.data;
}

export async function pushStats(minerId: string, stats: MinerSnapshot) {
  const res = await client.post(`/api/stats/${minerId}`, stats);
  return res.data;
}

export async function updateMinerAPI(
  id: string,
  data: { name?: string; ip?: string; port?: number },
) {
  const res = await client.put(`/api/miners/${id}`, data);
  return res.data;
}

export async function getSettings() {
  const res = await client.get('/api/settings');
  return res.data;
}

export async function putSetting(key: string, value: string) {
  const res = await client.put('/api/settings', { key, value });
  return res.data;
}

export async function deleteSetting(key: string) {
  const res = await client.delete(`/api/settings/${key}`);
  return res.data;
}

export async function validateReceipt(receipt: string, productId: string) {
  const res = await client.post('/api/receipt/validate', { receipt, productId });
  return res.data;
}

export async function getNotificationPrefs(minerId: string) {
  const res = await client.get(`/api/notification-prefs/${minerId}`);
  return res.data as Record<string, boolean>;
}

export async function setNotificationPref(minerId: string, alertType: string, enabled: boolean) {
  await client.put(`/api/notification-prefs/${minerId}`, { alertType, enabled });
}
