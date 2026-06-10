import axios, { AxiosInstance } from 'axios';

let _getToken: () => string | null = () => null;
let _onUnauthorized: () => void = () => {};

export function configureClient(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  _getToken = opts.getToken;
  _onUnauthorized = opts.onUnauthorized;
}

export const BASE_URL = 'http://localhost:4000';

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
  }
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

export async function fetchMiners() {
  const res = await client.get('/api/miners');
  return res.data;
}

export async function createMiner(data: { name: string; ip: string; port?: number }) {
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

export async function pushStats(minerId: string, stats: any) {
  const res = await client.post(`/api/stats/${minerId}`, stats);
  return res.data;
}
