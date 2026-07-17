import { Miner } from '../types';

export interface HealthBreakdown {
  score: number;
  temperature: number;
  hashrate: number;
  uptime: number;
  shares: number;
  stability: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
}

const TEMP_MIN = 55;
const TEMP_MAX = 85;
const HASHRATE_GOOD = 500;
const HASHRATE_BAD = 250;
const UPTIME_GOOD = 24 * 60 * 60;
const UPTIME_BAD = 60 * 60;
const SHARES_GOOD = 0.99;
const SHARES_BAD = 0.9;
const STABILITY_PLACEHOLDER = 85;

const WEIGHT_TEMP = 0.25;
const WEIGHT_HASHRATE = 0.25;
const WEIGHT_UPTIME = 0.2;
const WEIGHT_SHARES = 0.2;
const WEIGHT_STABILITY = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function linearScale(value: number, inMin: number, inMax: number): number {
  if (value <= inMin) return 100;
  if (value >= inMax) return 0;
  return ((inMax - value) / (inMax - inMin)) * 100;
}

function ratioScale(value: number, goodThreshold: number, badThreshold: number): number {
  if (value >= goodThreshold) return 100;
  if (value <= badThreshold) return 0;
  return ((value - badThreshold) / (goodThreshold - badThreshold)) * 100;
}

function assignGrade(score: number): HealthBreakdown['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function calculateHealthScore(miner: Miner): HealthBreakdown {
  if (!miner.isOnline || !miner.status) {
    return {
      score: 0,
      temperature: 0,
      hashrate: 0,
      uptime: 0,
      shares: 0,
      stability: 0,
      grade: 'F',
    };
  }

  const s = miner.status;

  const temperature = linearScale(s.temperature, TEMP_MIN, TEMP_MAX);

  const hashrate = ratioScale(s.hashRate, HASHRATE_GOOD, HASHRATE_BAD);

  const uptime = ratioScale(s.uptimeSeconds, UPTIME_GOOD, UPTIME_BAD);

  const totalShares = s.sharesAccepted + s.sharesRejected;
  const shareRatio = totalShares > 0 ? s.sharesAccepted / totalShares : 1;
  const shares = ratioScale(shareRatio, SHARES_GOOD, SHARES_BAD);

  const stability = STABILITY_PLACEHOLDER;

  const score = clamp(
    Math.round(
      temperature * WEIGHT_TEMP +
        hashrate * WEIGHT_HASHRATE +
        uptime * WEIGHT_UPTIME +
        shares * WEIGHT_SHARES +
        stability * WEIGHT_STABILITY,
    ),
    0,
    100,
  );

  return {
    score,
    temperature: Math.round(temperature),
    hashrate: Math.round(hashrate),
    uptime: Math.round(uptime),
    shares: Math.round(shares),
    stability: Math.round(stability),
    grade: assignGrade(score),
  };
}
