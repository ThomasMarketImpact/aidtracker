/**
 * Shared formatting utilities for AidTracker
 */

// Funding level thresholds (USD per person in need)
export const FUNDING_THRESHOLD_HIGH = 150;
export const FUNDING_THRESHOLD_MEDIUM = 80;

/**
 * Format monetary values with appropriate suffix (B, M, K)
 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * Format large numbers with appropriate suffix (M, K)
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

/**
 * Get funding level classification based on funding per person
 * Uses neutral labeling (High/Medium/Low) rather than value judgments
 */
export function getFundingLevel(perPerson: number | null): { label: string; class: string } {
  if (!perPerson || !Number.isFinite(perPerson)) {
    return { label: 'N/A', class: 'badge-neutral' };
  }
  if (perPerson >= FUNDING_THRESHOLD_HIGH) {
    return { label: 'Well Funded', class: 'badge-funded-high' };
  }
  if (perPerson >= FUNDING_THRESHOLD_MEDIUM) {
    return { label: 'Moderate', class: 'badge-funded-medium' };
  }
  return { label: 'Underfunded', class: 'badge-funded-low' };
}

/**
 * Format percentage with sign prefix
 */
export function formatPercent(value: number | null, decimals: number = 1): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format year-over-year change with color indicator
 */
export function getYoyColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '#666';
  return value >= 0 ? '#22c55e' : '#ef4444';
}
