/**
 * Trend analysis utilities for funding data
 */

export type TrendDirection = 'up' | 'down' | 'stable';

export interface TrendData {
  values: number[];
  years: number[];
}

export interface TrendAnalysis {
  direction: TrendDirection;
  averageGrowthRate: number | null;
  cagr: number | null; // Compound Annual Growth Rate
  linearProjection: number | null;
  volatility: number | null;
  trend: 'strong_growth' | 'moderate_growth' | 'stable' | 'moderate_decline' | 'strong_decline';
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate average year-over-year growth rate
 */
export function calculateAverageGrowthRate(values: number[]): number | null {
  if (values.length < 2) return null;

  let totalGrowth = 0;
  let validYears = 0;

  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (prev > 0) {
      totalGrowth += ((curr - prev) / prev) * 100;
      validYears++;
    }
  }

  return validYears > 0 ? totalGrowth / validYears : null;
}

/**
 * Calculate linear regression for projection
 */
export function calculateLinearRegression(values: number[]): { slope: number; intercept: number } | null {
  const n = values.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Project next year's value using linear regression
 */
export function projectNextValue(values: number[]): number | null {
  const regression = calculateLinearRegression(values);
  if (!regression) return null;

  const nextIndex = values.length;
  return regression.slope * nextIndex + regression.intercept;
}

/**
 * Calculate volatility (standard deviation of growth rates)
 */
export function calculateVolatility(values: number[]): number | null {
  if (values.length < 3) return null;

  const growthRates: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev > 0) {
      growthRates.push(((values[i] - prev) / prev) * 100);
    }
  }

  if (growthRates.length < 2) return null;

  const mean = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  const squaredDiffs = growthRates.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / growthRates.length;

  return Math.sqrt(variance);
}

/**
 * Determine trend direction based on recent values
 */
export function getTrendDirection(values: number[]): TrendDirection {
  if (values.length < 2) return 'stable';

  // Use last 3 values for direction (or all if less than 3)
  const recentValues = values.slice(-3);
  const first = recentValues[0];
  const last = recentValues[recentValues.length - 1];

  if (first <= 0) return 'stable';

  const change = ((last - first) / first) * 100;

  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

/**
 * Classify trend strength
 */
export function classifyTrend(avgGrowthRate: number | null): TrendAnalysis['trend'] {
  if (avgGrowthRate === null) return 'stable';

  if (avgGrowthRate > 10) return 'strong_growth';
  if (avgGrowthRate > 3) return 'moderate_growth';
  if (avgGrowthRate >= -3) return 'stable';
  if (avgGrowthRate >= -10) return 'moderate_decline';
  return 'strong_decline';
}

/**
 * Perform comprehensive trend analysis on a data series
 */
export function analyzeTrend(data: TrendData): TrendAnalysis {
  const { values } = data;

  const direction = getTrendDirection(values);
  const averageGrowthRate = calculateAverageGrowthRate(values);

  let cagr = null;
  if (values.length >= 2) {
    const startValue = values[0];
    const endValue = values[values.length - 1];
    cagr = calculateCAGR(startValue, endValue, values.length - 1);
  }

  const linearProjection = projectNextValue(values);
  const volatility = calculateVolatility(values);
  const trend = classifyTrend(averageGrowthRate);

  return {
    direction,
    averageGrowthRate,
    cagr,
    linearProjection,
    volatility,
    trend,
  };
}

/**
 * Get trend indicator emoji
 */
export function getTrendIndicator(trend: TrendAnalysis['trend']): string {
  switch (trend) {
    case 'strong_growth': return '\u2191\u2191'; // ↑↑
    case 'moderate_growth': return '\u2191'; // ↑
    case 'stable': return '\u2192'; // →
    case 'moderate_decline': return '\u2193'; // ↓
    case 'strong_decline': return '\u2193\u2193'; // ↓↓
  }
}

/**
 * Get trend color class
 */
export function getTrendColor(trend: TrendAnalysis['trend']): string {
  switch (trend) {
    case 'strong_growth':
    case 'moderate_growth':
      return 'positive';
    case 'stable':
      return 'neutral';
    case 'moderate_decline':
    case 'strong_decline':
      return 'negative';
  }
}
