import { useState, useEffect, useMemo } from 'react';
import { useMinerStore } from '../store/miners';
import { toHashesPerSecond } from '../utils/hashrate';
import * as DB from '../db/database';
import { Miner } from '../types';

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

export function useDashboardMetrics(filteredMiners: Miner[]) {
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
      const snapshots = (await Promise.all(miners.map((m) => DB.getSnapshots(m.id, 100))))
        .flat()
        .sort((a, b) => a.timestamp - b.timestamp);

      if (cancelled) return;

      const recent = snapshots.slice(-20);
      const hashrateHistory = recent.map((s) => toHashesPerSecond(s.hashRate, s.hashRateUnit));
      const powerHistory = recent.map((s) => s.power);
      const uptimeHistory = recent.map((s) => s.uptimeSeconds);

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
        recentHashrates: hashrateHistory.slice(-7),
        recentPower: powerHistory.slice(-7),
        recentUptimes: uptimeHistory.slice(-7),
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
