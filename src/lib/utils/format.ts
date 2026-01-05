/**
 * Formatting utility functions for display
 */

/**
 * Format a monetary value with appropriate suffix (B for billions, M for millions)
 */
export function formatMoney(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

/**
 * Format a number with appropriate suffix (M for millions, K for thousands)
 */
export function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

/**
 * Get funding level badge information based on per-person funding amount
 */
export function getFundingLevel(perPerson: number | null): { label: string; class: string } {
  if (!perPerson) return { label: 'N/A', class: 'badge-neutral' };
  if (perPerson >= 150) return { label: 'Well Funded', class: 'badge-funded-high' };
  if (perPerson >= 80) return { label: 'Moderate', class: 'badge-funded-medium' };
  return { label: 'Underfunded', class: 'badge-funded-low' };
}

/**
 * Format a percentage change with sign and color info
 */
export function formatYoyChange(change: number | null): { text: string; color: string } {
  if (change === null) {
    return { text: 'N/A', color: '#666' };
  }
  const sign = change >= 0 ? '+' : '';
  const color = change >= 0 ? '#22c55e' : '#ef4444';
  return { text: `${sign}${change.toFixed(0)}%`, color };
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
