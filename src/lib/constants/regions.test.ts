import { describe, it, expect } from 'vitest';
import {
  getCountryRegion,
  aggregateByRegion,
  getRegionalSummary,
  COUNTRY_REGIONS,
  ALL_REGIONS,
  REGION_COLORS,
} from './regions';

describe('getCountryRegion', () => {
  it('returns correct region for known countries', () => {
    expect(getCountryRegion('SYR')).toBe('Middle East');
    expect(getCountryRegion('ETH')).toBe('Africa - East');
    expect(getCountryRegion('NGA')).toBe('Africa - West');
    expect(getCountryRegion('COD')).toBe('Africa - Central');
    expect(getCountryRegion('AFG')).toBe('Asia - South');
    expect(getCountryRegion('MMR')).toBe('Asia - Southeast');
    expect(getCountryRegion('HTI')).toBe('Latin America');
    expect(getCountryRegion('UKR')).toBe('Europe');
  });

  it('returns Other for unknown countries', () => {
    expect(getCountryRegion('XXX')).toBe('Other');
    expect(getCountryRegion('')).toBe('Other');
  });
});

describe('aggregateByRegion', () => {
  const testData = [
    { iso3: 'SYR', value: 1000 },
    { iso3: 'YEM', value: 2000 },
    { iso3: 'ETH', value: 500 },
    { iso3: 'XXX', value: 100 },
  ];

  it('aggregates values by region', () => {
    const result = aggregateByRegion(testData, item => item.value);

    const middleEast = result.get('Middle East');
    expect(middleEast?.total).toBe(3000);
    expect(middleEast?.countries).toHaveLength(2);

    const africaEast = result.get('Africa - East');
    expect(africaEast?.total).toBe(500);
    expect(africaEast?.countries).toHaveLength(1);

    const other = result.get('Other');
    expect(other?.total).toBe(100);
  });

  it('initializes all regions', () => {
    const result = aggregateByRegion([], item => 0);

    expect(result.size).toBe(ALL_REGIONS.length);
    for (const region of ALL_REGIONS) {
      expect(result.has(region)).toBe(true);
    }
  });
});

describe('getRegionalSummary', () => {
  const testData = [
    { iso3: 'SYR', value: 1000 },
    { iso3: 'YEM', value: 2000 },
    { iso3: 'ETH', value: 500 },
    { iso3: 'SSD', value: 300 },
  ];

  it('returns sorted summary', () => {
    const result = getRegionalSummary(testData, item => item.value);

    // Middle East should be first (3000 total)
    expect(result[0].region).toBe('Middle East');
    expect(result[0].total).toBe(3000);
    expect(result[0].countryCount).toBe(2);

    // Africa - East should be second (800 total)
    expect(result[1].region).toBe('Africa - East');
    expect(result[1].total).toBe(800);
    expect(result[1].countryCount).toBe(2);
  });

  it('includes correct colors', () => {
    const result = getRegionalSummary(testData, item => item.value);

    result.forEach(r => {
      expect(r.color).toBe(REGION_COLORS[r.region]);
    });
  });

  it('filters out regions with zero total', () => {
    const result = getRegionalSummary(testData, item => item.value);

    // Should only have regions with data
    expect(result.every(r => r.total > 0)).toBe(true);
    expect(result.length).toBeLessThan(ALL_REGIONS.length);
  });
});

describe('constants', () => {
  it('COUNTRY_REGIONS has valid regions', () => {
    Object.values(COUNTRY_REGIONS).forEach(region => {
      expect(ALL_REGIONS).toContain(region);
    });
  });

  it('REGION_COLORS covers all regions', () => {
    ALL_REGIONS.forEach(region => {
      expect(REGION_COLORS[region]).toBeDefined();
      expect(typeof REGION_COLORS[region]).toBe('string');
    });
  });

  it('ALL_REGIONS has expected regions', () => {
    expect(ALL_REGIONS).toContain('Middle East');
    expect(ALL_REGIONS).toContain('Africa - East');
    expect(ALL_REGIONS).toContain('Asia - South');
    expect(ALL_REGIONS).toContain('Latin America');
    expect(ALL_REGIONS).toContain('Other');
  });
});
