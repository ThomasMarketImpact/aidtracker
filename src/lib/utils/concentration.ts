/**
 * Donor Concentration Analysis
 * Uses Herfindahl-Hirschman Index (HHI) and other metrics to measure funding concentration
 */

export interface ConcentrationResult {
  hhi: number;                    // Herfindahl-Hirschman Index (0-10000)
  normalizedHhi: number;          // Normalized HHI (0-1)
  concentrationLevel: 'low' | 'moderate' | 'high' | 'very_high';
  topDonorShare: number;          // % of funding from top donor
  top3DonorShare: number;         // % of funding from top 3 donors
  top5DonorShare: number;         // % of funding from top 5 donors
  effectiveDonors: number;        // Equivalent number of equal-sized donors
  giniCoefficient: number;        // Gini coefficient (0-1)
}

export interface DonorShare {
  name: string;
  funding: number;
  share: number;  // percentage (0-100)
}

/**
 * Calculate Herfindahl-Hirschman Index
 * HHI = sum of squared market shares
 * Range: 0 (perfect competition) to 10000 (monopoly)
 */
export function calculateHHI(shares: number[]): number {
  if (shares.length === 0) return 0;

  // Normalize shares to percentages if needed (should sum to 100)
  const total = shares.reduce((sum, s) => sum + s, 0);
  if (total === 0) return 0;

  const normalizedShares = shares.map(s => (s / total) * 100);
  return normalizedShares.reduce((sum, share) => sum + share * share, 0);
}

/**
 * Calculate normalized HHI (0 to 1)
 * Adjusts for number of firms to allow comparison across different markets
 */
export function calculateNormalizedHHI(hhi: number, n: number): number {
  if (n <= 1) return 1;
  const minHHI = 10000 / n;  // HHI if all firms were equal size
  const maxHHI = 10000;      // HHI for monopoly
  return (hhi - minHHI) / (maxHHI - minHHI);
}

/**
 * Get concentration level based on HHI
 * Based on US DOJ/FTC Horizontal Merger Guidelines thresholds
 */
export function getConcentrationLevel(hhi: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (hhi < 1500) return 'low';
  if (hhi < 2500) return 'moderate';
  if (hhi < 5000) return 'high';
  return 'very_high';
}

/**
 * Calculate effective number of donors (inverse HHI)
 * Represents the equivalent number of equal-sized donors
 */
export function calculateEffectiveDonors(hhi: number): number {
  if (hhi === 0) return 0;
  return 10000 / hhi;
}

/**
 * Calculate Gini coefficient for donor concentration
 * 0 = perfect equality, 1 = perfect inequality
 */
export function calculateGiniCoefficient(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  if (n === 1) return 0;

  // Sort values in ascending order
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);

  if (total === 0) return 0;

  // Calculate Gini using the formula: G = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n+1)/n
  let weightedSum = 0;

  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * sorted[i];
  }

  return (2 * weightedSum) / (n * total) - (n + 1) / n;
}

/**
 * Calculate comprehensive concentration metrics for a set of donors
 */
export function calculateConcentration(
  donors: Array<{ name: string; funding: number }>
): ConcentrationResult {
  if (donors.length === 0) {
    return {
      hhi: 0,
      normalizedHhi: 0,
      concentrationLevel: 'low',
      topDonorShare: 0,
      top3DonorShare: 0,
      top5DonorShare: 0,
      effectiveDonors: 0,
      giniCoefficient: 0
    };
  }

  // Sort by funding descending
  const sorted = [...donors].sort((a, b) => b.funding - a.funding);
  const total = sorted.reduce((sum, d) => sum + d.funding, 0);

  if (total === 0) {
    return {
      hhi: 0,
      normalizedHhi: 0,
      concentrationLevel: 'low',
      topDonorShare: 0,
      top3DonorShare: 0,
      top5DonorShare: 0,
      effectiveDonors: 0,
      giniCoefficient: 0
    };
  }

  // Calculate shares
  const shares = sorted.map(d => (d.funding / total) * 100);

  // Calculate metrics
  const hhi = calculateHHI(shares);
  const normalizedHhi = calculateNormalizedHHI(hhi, sorted.length);
  const concentrationLevel = getConcentrationLevel(hhi);

  const topDonorShare = shares[0] || 0;
  const top3DonorShare = shares.slice(0, 3).reduce((sum, s) => sum + s, 0);
  const top5DonorShare = shares.slice(0, 5).reduce((sum, s) => sum + s, 0);

  const effectiveDonors = calculateEffectiveDonors(hhi);
  const giniCoefficient = calculateGiniCoefficient(sorted.map(d => d.funding));

  return {
    hhi: Math.round(hhi),
    normalizedHhi: Math.round(normalizedHhi * 100) / 100,
    concentrationLevel,
    topDonorShare: Math.round(topDonorShare * 10) / 10,
    top3DonorShare: Math.round(top3DonorShare * 10) / 10,
    top5DonorShare: Math.round(top5DonorShare * 10) / 10,
    effectiveDonors: Math.round(effectiveDonors * 10) / 10,
    giniCoefficient: Math.round(giniCoefficient * 100) / 100
  };
}

/**
 * Get donor shares with names for display
 */
export function getDonorShares(
  donors: Array<{ name: string; funding: number }>,
  limit: number = 10
): DonorShare[] {
  const total = donors.reduce((sum, d) => sum + d.funding, 0);
  if (total === 0) return [];

  return donors
    .sort((a, b) => b.funding - a.funding)
    .slice(0, limit)
    .map(d => ({
      name: d.name,
      funding: d.funding,
      share: Math.round((d.funding / total) * 1000) / 10
    }));
}

/**
 * Compare concentration across multiple entities (countries, sectors, etc.)
 */
export function compareConcentration(
  entities: Array<{
    name: string;
    donors: Array<{ name: string; funding: number }>;
  }>
): Array<{ name: string; concentration: ConcentrationResult }> {
  return entities.map(entity => ({
    name: entity.name,
    concentration: calculateConcentration(entity.donors)
  })).sort((a, b) => b.concentration.hhi - a.concentration.hhi);
}

/**
 * Get concentration color for visualization
 */
export function getConcentrationColor(level: ConcentrationResult['concentrationLevel']): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'high': return '#f97316';
    case 'very_high': return '#ef4444';
  }
}

/**
 * Get concentration description for display
 */
export function getConcentrationDescription(level: ConcentrationResult['concentrationLevel']): string {
  switch (level) {
    case 'low':
      return 'Healthy diversification - funding comes from many donors';
    case 'moderate':
      return 'Moderate concentration - funding moderately diversified';
    case 'high':
      return 'High concentration - funding relies on few donors';
    case 'very_high':
      return 'Very high concentration - funding heavily dependent on 1-2 donors';
  }
}
