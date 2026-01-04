/**
 * Regional groupings for humanitarian funding analysis
 * Based on UN regional classifications
 */

export type Region =
  | 'Middle East'
  | 'Africa - East'
  | 'Africa - West'
  | 'Africa - Central'
  | 'Africa - Southern'
  | 'Africa - North'
  | 'Asia - South'
  | 'Asia - Southeast'
  | 'Asia - Central'
  | 'Europe'
  | 'Latin America'
  | 'Other';

export const COUNTRY_REGIONS: Record<string, Region> = {
  // Middle East
  SYR: 'Middle East',
  YEM: 'Middle East',
  IRQ: 'Middle East',
  PSE: 'Middle East',
  LBN: 'Middle East',
  JOR: 'Middle East',

  // Africa - East
  ETH: 'Africa - East',
  SSD: 'Africa - East',
  SOM: 'Africa - East',
  SDN: 'Africa - East',
  KEN: 'Africa - East',
  UGA: 'Africa - East',
  TZA: 'Africa - East',
  RWA: 'Africa - East',
  BDI: 'Africa - East',
  ERI: 'Africa - East',
  DJI: 'Africa - East',

  // Africa - West
  NGA: 'Africa - West',
  NER: 'Africa - West',
  MLI: 'Africa - West',
  BFA: 'Africa - West',
  TCD: 'Africa - West',
  SEN: 'Africa - West',
  GHA: 'Africa - West',
  LBR: 'Africa - West',
  SLE: 'Africa - West',
  GIN: 'Africa - West',
  CIV: 'Africa - West',
  MRT: 'Africa - West',

  // Africa - Central
  COD: 'Africa - Central',
  CAF: 'Africa - Central',
  CMR: 'Africa - Central',
  COG: 'Africa - Central',
  GAB: 'Africa - Central',

  // Africa - Southern
  ZWE: 'Africa - Southern',
  MOZ: 'Africa - Southern',
  MWI: 'Africa - Southern',
  ZMB: 'Africa - Southern',
  ZAF: 'Africa - Southern',
  AGO: 'Africa - Southern',
  NAM: 'Africa - Southern',
  BWA: 'Africa - Southern',
  LSO: 'Africa - Southern',
  SWZ: 'Africa - Southern',
  MDG: 'Africa - Southern',

  // Africa - North
  LBY: 'Africa - North',
  EGY: 'Africa - North',
  TUN: 'Africa - North',
  DZA: 'Africa - North',
  MAR: 'Africa - North',

  // Asia - South
  AFG: 'Asia - South',
  PAK: 'Asia - South',
  BGD: 'Asia - South',
  IND: 'Asia - South',
  NPL: 'Asia - South',
  LKA: 'Asia - South',

  // Asia - Southeast
  MMR: 'Asia - Southeast',
  PHL: 'Asia - Southeast',
  IDN: 'Asia - Southeast',
  VNM: 'Asia - Southeast',
  THA: 'Asia - Southeast',
  KHM: 'Asia - Southeast',
  LAO: 'Asia - Southeast',
  MYS: 'Asia - Southeast',

  // Asia - Central
  UKR: 'Europe',
  TJK: 'Asia - Central',
  KGZ: 'Asia - Central',
  UZB: 'Asia - Central',
  TKM: 'Asia - Central',

  // Latin America
  HTI: 'Latin America',
  VEN: 'Latin America',
  COL: 'Latin America',
  GTM: 'Latin America',
  HND: 'Latin America',
  SLV: 'Latin America',
  NIC: 'Latin America',
  ECU: 'Latin America',
  PER: 'Latin America',
  BRA: 'Latin America',
};

export const REGION_COLORS: Record<Region, string> = {
  'Middle East': '#ef4444',
  'Africa - East': '#f97316',
  'Africa - West': '#eab308',
  'Africa - Central': '#84cc16',
  'Africa - Southern': '#22c55e',
  'Africa - North': '#14b8a6',
  'Asia - South': '#06b6d4',
  'Asia - Southeast': '#3b82f6',
  'Asia - Central': '#8b5cf6',
  'Europe': '#a855f7',
  'Latin America': '#ec4899',
  'Other': '#6b7280',
};

export const ALL_REGIONS: Region[] = [
  'Middle East',
  'Africa - East',
  'Africa - West',
  'Africa - Central',
  'Africa - Southern',
  'Africa - North',
  'Asia - South',
  'Asia - Southeast',
  'Asia - Central',
  'Europe',
  'Latin America',
  'Other',
];

/**
 * Get region for a country by ISO3 code
 */
export function getCountryRegion(iso3: string): Region {
  return COUNTRY_REGIONS[iso3] || 'Other';
}

/**
 * Aggregate data by region
 */
export function aggregateByRegion<T extends { iso3: string }>(
  data: T[],
  getValue: (item: T) => number
): Map<Region, { total: number; countries: T[] }> {
  const result = new Map<Region, { total: number; countries: T[] }>();

  // Initialize all regions
  for (const region of ALL_REGIONS) {
    result.set(region, { total: 0, countries: [] });
  }

  // Aggregate data
  for (const item of data) {
    const region = getCountryRegion(item.iso3);
    const entry = result.get(region)!;
    entry.total += getValue(item);
    entry.countries.push(item);
  }

  return result;
}

/**
 * Get regional summary sorted by total value
 */
export function getRegionalSummary<T extends { iso3: string }>(
  data: T[],
  getValue: (item: T) => number
): Array<{ region: Region; total: number; countryCount: number; color: string }> {
  const aggregated = aggregateByRegion(data, getValue);

  return Array.from(aggregated.entries())
    .map(([region, { total, countries }]) => ({
      region,
      total,
      countryCount: countries.length,
      color: REGION_COLORS[region],
    }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total);
}
