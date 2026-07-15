import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
  isOnline: boolean;
  type: Network.NetworkStateType | null;
}

const POLL_INTERVAL_MS = 10000;

let _listeners: Array<(status: NetworkStatus) => void> = [];
let _currentStatus: NetworkStatus = { isOnline: true, type: null };
let _onReconnect: (() => void) | null = null;

async function checkNetwork(): Promise<NetworkStatus> {
  try {
    const state = await Network.getNetworkStateAsync();
    return {
      isOnline: state.isConnected ?? true,
      type: state.type ?? null,
    };
  } catch {
    return { isOnline: true, type: null };
  }
}

async function pollNetwork() {
  const prev = _currentStatus;
  _currentStatus = await checkNetwork();

  if (!prev.isOnline && _currentStatus.isOnline && _onReconnect) {
    _onReconnect();
  }

  _listeners.forEach((fn) => fn(_currentStatus));
}

let _interval: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (_interval) return;
  pollNetwork();
  _interval = setInterval(pollNetwork, POLL_INTERVAL_MS);
  if (_interval && typeof _interval === 'object' && 'unref' in _interval) {
    (_interval as { unref: () => void }).unref();
  }
}

function stopPolling() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(_currentStatus);

  useEffect(() => {
    _listeners.push(setStatus);
    startPolling();
    return () => {
      _listeners = _listeners.filter((fn) => fn !== setStatus);
      if (_listeners.length === 0) {
        stopPolling();
      }
    };
  }, []);

  return status;
}

export function onNetworkReconnect(callback: () => void): () => void {
  _onReconnect = callback;
  return () => {
    if (_onReconnect === callback) {
      _onReconnect = null;
    }
  };
}

/** @internal only for testing */
export function __resetNetworkStatus() {
  _listeners = [];
  _currentStatus = { isOnline: true, type: null };
  _onReconnect = null;
  stopPolling();
}
