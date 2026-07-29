import { Miner } from '../types';
import { getSetting, setSetting } from '../db/database';
import { BitAxeClient } from '../api/bitaxe';
import { recommendPools, analyzePoolPerformance } from '../utils/poolRecommendation';

export interface AutomatedActionsSettings {
  autoRestartEnabled: boolean;
  autoRestartDelayMinutes: number;
  autoPoolSwitchEnabled: boolean;
  autoPoolSwitchThreshold: number;
  autoGroupEnabled: boolean;
  maxRestartsPerHour: number;
}

export interface AutomatedAction {
  id: string;
  type: 'restart' | 'pool_switch' | 'group_assign';
  minerId: string;
  minerName: string;
  timestamp: number;
  success: boolean;
  details: string;
}

const SETTINGS_KEY = 'automated_actions_settings';
const ACTION_LOG_KEY = 'automated_action_log';

const DEFAULT_SETTINGS: AutomatedActionsSettings = {
  autoRestartEnabled: false,
  autoRestartDelayMinutes: 10,
  autoPoolSwitchEnabled: false,
  autoPoolSwitchThreshold: 5,
  autoGroupEnabled: false,
  maxRestartsPerHour: 3,
};

const POOL_PORT_MAP: Record<string, number> = {
  'solo.ckpool.org': 3333,
  'stratum.slushpool.com': 3333,
  'pool.ckpool.org': 3333,
  'stratum.luckpool.net': 3333,
  'pool.braiins.com': 3333,
  'ss.antpool.com': 3333,
};

const RESTART_COOLDOWN_MS = 60_000;
const MAX_LOG_ENTRIES = 100;

let _running = false;
let _restartTimestamps: Map<string, number[]> = new Map();
let _actionLog: AutomatedAction[] = [];
let _logLoaded = false;

function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadLog(): Promise<void> {
  if (_logLoaded) return;
  try {
    const raw = await getSetting(ACTION_LOG_KEY);
    if (raw) {
      _actionLog = JSON.parse(raw) as AutomatedAction[];
    }
  } catch {
    _actionLog = [];
  }
  _logLoaded = true;
}

async function persistLog(): Promise<void> {
  try {
    const trimmed = _actionLog.slice(-MAX_LOG_ENTRIES);
    await setSetting(ACTION_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full or unavailable
  }
}

function wasRecentlyRestarted(minerId: string, now: number): boolean {
  const timestamps = _restartTimestamps.get(minerId);
  if (!timestamps || timestamps.length === 0) return false;
  const last = timestamps[timestamps.length - 1];
  return now - last < RESTART_COOLDOWN_MS;
}

function canRestartInWindow(minerId: string, maxPerHour: number, now: number): boolean {
  const timestamps = _restartTimestamps.get(minerId) ?? [];
  const oneHourAgo = now - 60 * 60 * 1000;
  const recentCount = timestamps.filter((ts) => ts > oneHourAgo).length;
  return recentCount < maxPerHour;
}

function recordRestart(minerId: string, now: number): void {
  const timestamps = _restartTimestamps.get(minerId) ?? [];
  timestamps.push(now);
  const oneHourAgo = now - 60 * 60 * 1000;
  const filtered = timestamps.filter((ts) => ts > oneHourAgo);
  _restartTimestamps.set(minerId, filtered);
}

function logAction(action: AutomatedAction): void {
  _actionLog.push(action);
  if (_actionLog.length > MAX_LOG_ENTRIES) {
    _actionLog = _actionLog.slice(-MAX_LOG_ENTRIES);
  }
  void persistLog();
}

function getPoolHost(pool: string): string {
  const stripped = pool.replace(/^stratum\+tcp:\/\//, '').replace(/^stratum\+ssl:\/\//, '');
  return stripped.split(':')[0] || stripped;
}

export async function checkAndRestartOfflineMiners(miners: Miner[]): Promise<AutomatedAction[]> {
  if (_running) return [];

  try {
    _running = true;

    const settings = await getAutomatedActionsSettings();
    if (!settings.autoRestartEnabled) return [];

    const now = Date.now();
    const delayMs = settings.autoRestartDelayMinutes * 60 * 1000;
    const results: AutomatedAction[] = [];

    const offlineMiners = miners.filter((m) => {
      if (m.isOnline || m.maintenanceMode) return false;
      if (!m.lastSeen) return false;
      return now - m.lastSeen >= delayMs;
    });

    for (const miner of offlineMiners) {
      if (wasRecentlyRestarted(miner.id, now)) continue;
      if (!canRestartInWindow(miner.id, settings.maxRestartsPerHour, now)) continue;

      const action: AutomatedAction = {
        id: generateId(),
        type: 'restart',
        minerId: miner.id,
        minerName: miner.name,
        timestamp: now,
        success: false,
        details: '',
      };

      try {
        const client = new BitAxeClient(
          miner.ip,
          miner.port,
          miner.apiPath || undefined,
          miner.statusPath || undefined,
        );

        const ok = await client.restart();
        action.success = ok;
        action.details = ok
          ? `Restart command sent to ${miner.name} (${miner.ip})`
          : `Restart command failed for ${miner.name} (${miner.ip})`;

        if (ok) {
          recordRestart(miner.id, now);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        action.details = `Restart error for ${miner.name}: ${msg}`;
      }

      logAction(action);
      results.push(action);
    }

    return results;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const action: AutomatedAction = {
      id: generateId(),
      type: 'restart',
      minerId: '',
      minerName: '',
      timestamp: Date.now(),
      success: false,
      details: `Auto-restart check failed: ${msg}`,
    };
    logAction(action);
    return [action];
  } finally {
    _running = false;
  }
}

export async function checkProfitabilityAndSwitch(miners: Miner[]): Promise<AutomatedAction[]> {
  if (_running) return [];

  try {
    _running = true;

    const settings = await getAutomatedActionsSettings();
    if (!settings.autoPoolSwitchEnabled) return [];

    const results: AutomatedAction[] = [];
    const recommendations = recommendPools(miners);
    if (recommendations.length === 0) return [];

    const bestRec = recommendations[0];
    if (!bestRec || bestRec.estimatedImprovement < settings.autoPoolSwitchThreshold) {
      return [];
    }

    const targetPool = bestRec.pool;
    const targetPort = POOL_PORT_MAP[targetPool] ?? 3333;
    const poolStats = analyzePoolPerformance(miners);

    const worstPools = Object.entries(poolStats)
      .filter(([, stats]) => stats.avgRejectionRate >= 0.1)
      .sort((a, b) => b[1].avgRejectionRate - a[1].avgRejectionRate);

    if (worstPools.length === 0) return [];

    for (const [poolKey] of worstPools) {
      const affectedMiners = miners.filter((m) => {
        if (!m.isOnline || !m.status) return false;
        const minerPoolHost = getPoolHost(m.status.pool);
        return minerPoolHost === poolKey || minerPoolHost.endsWith('.' + poolKey);
      });

      for (const miner of affectedMiners) {
        if (!miner.status) continue;

        const currentPoolHost = getPoolHost(miner.status.pool);
        if (currentPoolHost === targetPool) continue;

        const action: AutomatedAction = {
          id: generateId(),
          type: 'pool_switch',
          minerId: miner.id,
          minerName: miner.name,
          timestamp: Date.now(),
          success: false,
          details: '',
        };

        try {
          const client = new BitAxeClient(
            miner.ip,
            miner.port,
            miner.apiPath || undefined,
            miner.statusPath || undefined,
          );

          const ok = await client.setPool(targetPool, targetPort, miner.status.poolUser);
          action.success = ok;
          action.details = ok
            ? `Switched ${miner.name} from ${currentPoolHost} to ${targetPool}`
            : `Pool switch failed for ${miner.name}: ${currentPoolHost} → ${targetPool}`;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          action.details = `Pool switch error for ${miner.name}: ${msg}`;
        }

        logAction(action);
        results.push(action);
      }
    }

    return results;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const action: AutomatedAction = {
      id: generateId(),
      type: 'pool_switch',
      minerId: '',
      minerName: '',
      timestamp: Date.now(),
      success: false,
      details: `Auto-pool-switch check failed: ${msg}`,
    };
    logAction(action);
    return [action];
  } finally {
    _running = false;
  }
}

export async function getAutomatedActionsSettings(): Promise<AutomatedActionsSettings> {
  try {
    const raw = await getSetting(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveAutomatedActionsSettings(
  settings: AutomatedActionsSettings,
): Promise<void> {
  await setSetting(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getLastActionLog(): Promise<AutomatedAction[]> {
  await loadLog();
  return [..._actionLog].reverse();
}

export function __resetAutomatedActions(): void {
  _running = false;
  _restartTimestamps = new Map();
  _actionLog = [];
  _logLoaded = false;
}
