import { useMinerStore } from '../store/miners';
import { MinerSnapshot } from '../types';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let url: string | null = null;
let token: string | null = null;

function getBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  return apiUrl.replace(/^http/, 'ws') + '/ws';
}

export function connectWebSocket(authToken: string) {
  token = authToken;
  url = getBaseUrl();
  doConnect();
}

function doConnect() {
  if (ws || !url) return;
  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      if (token) {
        ws?.send(JSON.stringify({ type: 'auth', token }));
      }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch { }
    };
    ws.onclose = () => {
      ws = null;
      scheduleReconnect();
    };
    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, 5000);
}

function handleMessage(msg: any) {
  if (msg.type === 'snapshot' && msg.snapshot) {
    const snap = msg.snapshot as MinerSnapshot;
    const miner = useMinerStore.getState().miners.find((m) => m.id === snap.minerId);
    if (miner) {
      useMinerStore.getState().refreshMiner(snap.minerId);
    }
  }
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  token = null;
  url = null;
  ws?.close();
  ws = null;
}
