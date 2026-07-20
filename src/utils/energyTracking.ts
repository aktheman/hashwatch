export interface EnergySource {
  id: string;
  name: string;
  type: 'grid' | 'solar' | 'wind' | 'hydro' | 'battery';
  maxWatts: number;
  color: string;
}

export interface EnergyReading {
  sourceId: string;
  watts: number;
  timestamp: number;
  carbonKg: number;
}

export interface EnergyStats {
  totalKwhToday: number;
  renewablePercent: number;
  gridPercent: number;
  carbonSavedKg: number;
  estimatedCost: number;
}

export const DEFAULT_SOURCES: EnergySource[] = [
  { id: 'grid', name: 'Grid Power', type: 'grid', maxWatts: 5000, color: '#ff4444' },
  { id: 'solar', name: 'Solar Panels', type: 'solar', maxWatts: 3000, color: '#ffaa00' },
];

const CARBON_FACTORS: Record<string, number> = {
  grid: 0.45,
  solar: 0.0,
  wind: 0.0,
  hydro: 0.0,
  battery: 0.1,
};

const DEFAULT_RATE_PER_KWH = 0.12;

export function calculateCarbonKg(watts: number, sourceType: string): number {
  const factor = CARBON_FACTORS[sourceType] ?? CARBON_FACTORS.grid;
  return (watts / 1000) * factor;
}

export function estimateCost(kwh: number, ratePerKwh: number = DEFAULT_RATE_PER_KWH): number {
  return kwh * ratePerKwh;
}

export function calculateEnergyStats(
  readings: EnergyReading[],
  sources: EnergySource[],
): EnergyStats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayReadings = readings.filter((r) => r.timestamp >= todayMs);

  let totalWattHours = 0;
  let gridWattHours = 0;
  let renewableWattHours = 0;
  let totalCarbonKg = 0;

  for (const reading of todayReadings) {
    const hoursSinceReading = 1 / 60;
    const wattHours = reading.watts * hoursSinceReading;
    totalWattHours += wattHours;

    const source = sources.find((s) => s.id === reading.sourceId);
    const sourceType = source?.type ?? 'grid';
    if (sourceType === 'grid') {
      gridWattHours += wattHours;
    } else {
      renewableWattHours += wattHours;
    }

    const gridCarbon = calculateCarbonKg(reading.watts, 'grid');
    const actualCarbon = calculateCarbonKg(reading.watts, sourceType);
    totalCarbonKg += (gridCarbon - actualCarbon) * hoursSinceReading;
  }

  const totalKwh = totalWattHours / 1000;
  const renewablePercent = totalKwh > 0 ? (renewableWattHours / totalWattHours) * 100 : 0;
  const gridPercent = totalKwh > 0 ? (gridWattHours / totalWattHours) * 100 : 0;

  return {
    totalKwhToday: Math.round(totalKwh * 1000) / 1000,
    renewablePercent: Math.round(renewablePercent),
    gridPercent: Math.round(gridPercent),
    carbonSavedKg: Math.round(totalCarbonKg * 1000) / 1000,
    estimatedCost: Math.round(estimateCost(totalKwh) * 100) / 100,
  };
}
