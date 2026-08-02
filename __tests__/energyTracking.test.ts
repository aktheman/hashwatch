import {
  calculateCarbonKg,
  calculateEnergyStats,
  estimateCost,
  DEFAULT_SOURCES,
  EnergyReading,
  EnergySource,
} from '../src/utils/energyTracking';

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function makeReading(overrides: Partial<EnergyReading> = {}): EnergyReading {
  return {
    sourceId: 'grid',
    watts: 60000,
    timestamp: Date.now(),
    carbonKg: 0,
    ...overrides,
  };
}

const SOURCES: EnergySource[] = [
  ...DEFAULT_SOURCES,
  { id: 'battery', name: 'Battery', type: 'battery', maxWatts: 5000, color: '#0af' },
];

describe('calculateCarbonKg', () => {
  it('uses the grid factor for grid power', () => {
    expect(calculateCarbonKg(1000, 'grid')).toBe(0.45);
  });

  it('returns 0 for carbon-free sources', () => {
    expect(calculateCarbonKg(1000, 'solar')).toBe(0);
    expect(calculateCarbonKg(1000, 'wind')).toBe(0);
    expect(calculateCarbonKg(1000, 'hydro')).toBe(0);
  });

  it('uses the battery factor', () => {
    expect(calculateCarbonKg(1000, 'battery')).toBe(0.1);
  });

  it('falls back to the grid factor for unknown sources', () => {
    expect(calculateCarbonKg(1000, 'nuclear')).toBe(0.45);
  });

  it('returns 0 for zero watts', () => {
    expect(calculateCarbonKg(0, 'grid')).toBe(0);
  });

  it('handles negative watts', () => {
    expect(calculateCarbonKg(-1000, 'grid')).toBe(-0.45);
  });
});

describe('estimateCost', () => {
  it('uses the default rate per kWh', () => {
    expect(estimateCost(10)).toBe(1.2);
  });

  it('uses a custom rate per kWh', () => {
    expect(estimateCost(10, 0.2)).toBe(2);
  });

  it('returns 0 for zero kWh', () => {
    expect(estimateCost(0)).toBe(0);
  });

  it('returns negative cost for negative kWh', () => {
    expect(estimateCost(-10)).toBe(-1.2);
  });
});

describe('calculateEnergyStats - grid power', () => {
  it('computes kWh, grid percent and cost for a single grid reading', () => {
    const stats = calculateEnergyStats([makeReading()], SOURCES);

    expect(stats.totalKwhToday).toBe(1);
    expect(stats.renewablePercent).toBe(0);
    expect(stats.gridPercent).toBe(100);
    expect(stats.carbonSavedKg).toBe(0);
    expect(stats.estimatedCost).toBe(0.12);
  });
});

describe('calculateEnergyStats - renewable power', () => {
  it('computes renewable percent and carbon saved for a solar reading', () => {
    const stats = calculateEnergyStats([makeReading({ sourceId: 'solar' })], SOURCES);

    expect(stats.totalKwhToday).toBe(1);
    expect(stats.renewablePercent).toBe(100);
    expect(stats.gridPercent).toBe(0);
    expect(stats.carbonSavedKg).toBe(0.45);
    expect(stats.estimatedCost).toBe(0.12);
  });

  it('computes carbon saved for a battery reading', () => {
    const stats = calculateEnergyStats([makeReading({ sourceId: 'battery' })], SOURCES);

    expect(stats.renewablePercent).toBe(100);
    expect(stats.carbonSavedKg).toBeCloseTo(0.35, 2);
  });
});

describe('calculateEnergyStats - mixed sources', () => {
  it('splits renewable and grid percent evenly', () => {
    const stats = calculateEnergyStats(
      [
        makeReading({ sourceId: 'grid', watts: 30000 }),
        makeReading({ sourceId: 'solar', watts: 30000 }),
      ],
      SOURCES,
    );

    expect(stats.totalKwhToday).toBe(1);
    expect(stats.renewablePercent).toBe(50);
    expect(stats.gridPercent).toBe(50);
    expect(stats.carbonSavedKg).toBe(0.225);
    expect(stats.estimatedCost).toBe(0.12);
  });
});

describe('calculateEnergyStats - edge cases', () => {
  it('returns zeros for no readings', () => {
    const stats = calculateEnergyStats([], SOURCES);

    expect(stats).toEqual({
      totalKwhToday: 0,
      renewablePercent: 0,
      gridPercent: 0,
      carbonSavedKg: 0,
      estimatedCost: 0,
    });
  });

  it('ignores readings from before today', () => {
    const stats = calculateEnergyStats([makeReading({ timestamp: todayStart() - 1000 })], SOURCES);

    expect(stats.totalKwhToday).toBe(0);
    expect(stats.gridPercent).toBe(0);
  });

  it('treats readings with an unknown source as grid power', () => {
    const stats = calculateEnergyStats([makeReading({ sourceId: 'mystery' })], SOURCES);

    expect(stats.gridPercent).toBe(100);
    expect(stats.renewablePercent).toBe(0);
    expect(stats.carbonSavedKg).toBe(0);
  });

  it('treats readings with an unknown source and no matching source list entry as grid', () => {
    const stats = calculateEnergyStats([makeReading({ sourceId: 'mystery' })], []);

    expect(stats.gridPercent).toBe(100);
    expect(stats.renewablePercent).toBe(0);
  });

  it('does not throw on negative watts', () => {
    const stats = calculateEnergyStats([makeReading({ watts: -60000 })], SOURCES);

    expect(stats.totalKwhToday).toBe(-1);
    expect(stats.renewablePercent).toBe(0);
    expect(stats.gridPercent).toBe(0);
    expect(stats.estimatedCost).toBe(-0.12);
  });

  it('does not throw on NaN watts', () => {
    expect(() => calculateEnergyStats([makeReading({ watts: NaN })], SOURCES)).not.toThrow();
  });
});

describe('DEFAULT_SOURCES', () => {
  it('provides grid and solar sources', () => {
    expect(DEFAULT_SOURCES).toHaveLength(2);
    expect(DEFAULT_SOURCES[0].type).toBe('grid');
    expect(DEFAULT_SOURCES[1].type).toBe('solar');
  });
});
