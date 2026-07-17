import { useMinerStore } from '../store/miners';
import { MinerSnapshot, WSMessage } from '../types';
import { getExtra } from '../constants';

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let url: string | null = null;
let token: string | null = null;
let messageCallback: ((msg: WSMessage) => void) | null = null;

function getBaseUrl(): string {
  const apiUrl = getExtra().apiUrl;
  return apiUrl.replace(/^http/, 'ws') + '/ws';
}

export function connectWebSocket(authToken: string) {
  token = authToken;
  url = getBaseUrl();
  reconnectAttempts = 0;
  ensureSWListener();
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  doConnect();
}

function doConnect() {
  if (ws || !url) return;
  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      reconnectAttempts = 0;
      if (token) {
        ws?.send(JSON.stringify({ type: 'auth', token }));
      }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
        messageCallback?.(msg);
      } catch (e) {
        console.warn('WebSocket message parse error:', e);
      }
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
  if (reconnectTimer || !token) return;
  const delay = Math.min(
    RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts),
    MAX_RECONNECT_DELAY_MS,
  );
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, delay);
  if (typeof reconnectTimer === 'object' && 'unref' in reconnectTimer) {
    reconnectTimer.unref();
  }
}

function handleMessage(msg: WSMessage) {
  if (msg.type === 'snapshot' && msg.snapshot) {
    const snap = msg.snapshot as MinerSnapshot;
    const miner = useMinerStore.getState().miners.find((m) => m.remoteId === snap.minerId);
    if (miner) {
      useMinerStore.getState().applyRemoteSnapshot(miner.id, snap);
    }
  }
  if (msg.type === 'miner_update' && msg.miner) {
    const data = msg.miner as { id: string; isOnline: boolean; lastSeen?: number };
    useMinerStore.getState().updateMinerFromServer(data);
  }
}

export function onWebSocketMessage(callback: (msg: WSMessage) => void): () => void {
  messageCallback = callback;
  return () => {
    if (messageCallback === callback) messageCallback = null;
  };
}

export function isWebSocketConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

let swListenerInstalled = false;

function ensureSWListener() {
  if (swListenerInstalled || typeof window === 'undefined' || !window.addEventListener) return;
  swListenerInstalled = true;
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'SW_RECONNECT' && !ws && token) {
      reconnectAttempts = 0;
      doConnect();
    }
  });
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  token = null;
  url = null;
  reconnectAttempts = 0;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}
