import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
  isOnline: boolean;
  type: Network.NetworkStateType | null;
}

let _listeners: Array<(status: NetworkStatus) => void> = [];
let _currentStatus: NetworkStatus = { isOnline: true, type: null };

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
  _currentStatus = await checkNetwork();
  _listeners.forEach((fn) => fn(_currentStatus));
}

let _interval: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (_interval) return;
  pollNetwork();
  _interval = setInterval(pollNetwork, 10000);
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
