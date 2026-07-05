import { useState, useEffect, useMemo } from 'react';
import { useMinerStore } from '../store/miners';
import { toHashesPerSecond } from '../utils/hashrate';
import * as DB from '../db/database';
import { Miner } from '../types';

export type TimeRange = '1h' | '6h' | '24h' | '7d';

const RANGE_LIMITS: Record<TimeRange, { snapCount: number; nowWindow: number }> = {
  '1h': { snapCount: 50, nowWindow: 3600 },
  '6h': { snapCount: 100, nowWindow: 21600 },
  '24h': { snapCount: 200, nowWindow: 86400 },
  '7d': { snapCount: 500, nowWindow: 604800 },
};

interface Metrics {
  hashrateHistory: number[];
  powerHistory: number[];
  uptimeHistory: number[];
  hashrateTrend: string;
  powerTrend: string;
  workerTrend: string;
  uptimeAvg: number;
  efficiencyPct: number;
  recentHashrates: number[];
  recentPower: number[];
  recentUptimes: number[];
}

function bucketData<T>(data: T[], count: number): T[] {
  if (data.length <= count) return data;
  const step = Math.ceil(data.length / count);
  const result: T[] = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  return result.slice(-count);
}

export function useDashboardMetrics(filteredMiners: Miner[], timeRange: TimeRange = '7d') {
  const miners = useMinerStore((s) => s.miners);

  const [metrics, setMetrics] = useState<Metrics>({
    hashrateHistory: [],
    powerHistory: [],
    uptimeHistory: [],
    hashrateTrend: '',
    powerTrend: '',
    workerTrend: '',
    uptimeAvg: 0,
    efficiencyPct: 0,
    recentHashrates: [],
    recentPower: [],
    recentUptimes: [],
  });

  useEffect(() => {
    if (miners.length === 0) return;
    let cancelled = false;
    (async () => {
      const limits = RANGE_LIMITS[timeRange];
      const snapshots = (
        await Promise.all(miners.map((m) => DB.getSnapshots(m.id, limits.snapCount)))
      )
        .flat()
        .filter((s) => s.timestamp > Date.now() / 1000 - limits.nowWindow)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (cancelled) return;

      const displayCount = timeRange === '7d' ? 30 : 20;
      let hashrateHistory = snapshots.map((s) => toHashesPerSecond(s.hashRate, s.hashRateUnit));
      let powerHistory = snapshots.map((s) => s.power);
      let uptimeHistory = snapshots.map((s) => s.uptimeSeconds);
      hashrateHistory = bucketData(hashrateHistory, displayCount);
      powerHistory = bucketData(powerHistory, displayCount);
      uptimeHistory = bucketData(uptimeHistory, displayCount);

      const totalHr = filteredMiners.reduce(
        (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
        0,
      );
      const totalPw = filteredMiners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);

      const computeTrend = (vals: number[]): string => {
        if (vals.length < 2) return '';
        const first = vals[0];
        const last = vals[vals.length - 1];
        if (first === 0) return '';
        const pct = ((last - first) / first) * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      };

      const avgUptime =
        filteredMiners.length > 0
          ? filteredMiners.reduce((s, m) => s + (m.status?.uptimeSeconds ?? 0), 0) /
            filteredMiners.length
          : 0;

      const efficiencyPct =
        totalPw > 0 && totalHr > 0 ? Math.min(100, (totalHr / 1e12 / totalPw) * 100) : 0;

      setMetrics({
        hashrateHistory,
        powerHistory,
        uptimeHistory,
        hashrateTrend: computeTrend(hashrateHistory),
        powerTrend: computeTrend(powerHistory),
        workerTrend: snapshots.length > 0 ? `+${filteredMiners.length}` : '',
        uptimeAvg: avgUptime,
        efficiencyPct,
        recentHashrates: hashrateHistory.slice(-Math.min(7, hashrateHistory.length)),
        recentPower: powerHistory.slice(-Math.min(7, powerHistory.length)),
        recentUptimes: uptimeHistory.slice(-Math.min(7, uptimeHistory.length)),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [miners, filteredMiners]);

  const uptimeChartData = useMemo(
    () => metrics.recentUptimes.map((u) => Math.round(u / 3600)),
    [metrics.recentUptimes],
  );

  const totalHashrate = useMemo(
    () =>
      filteredMiners.reduce(
        (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
        0,
      ),
    [filteredMiners],
  );

  const totalPower = useMemo(
    () => filteredMiners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0),
    [filteredMiners],
  );

  const avgTemp = useMemo(() => {
    if (filteredMiners.length === 0) return 0;
    const total = filteredMiners.reduce((s, m) => s + (m.status?.temperature ?? 0), 0);
    return total / filteredMiners.length;
  }, [filteredMiners]);

  return {
    metrics,
    uptimeChartData,
    totalHashrate,
    totalPower,
    avgTemp,
  };
}
