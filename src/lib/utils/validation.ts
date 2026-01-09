/**
 * Shared validation utilities for AidTracker
 */

// Valid year range for humanitarian funding data
export const MIN_YEAR = 2016;
export const MAX_YEAR = 2025; // 2026+ data is incomplete
export const DEFAULT_YEAR = 2025;

/**
 * Parse and validate year parameter with comprehensive validation
 * Guards against NaN, Infinity, non-integers, and out-of-range values
 */
export function parseYear(yearParam: string | null): number {
  if (!yearParam) return DEFAULT_YEAR;

  const parsed = parseInt(yearParam, 10);

  // Validate: must be a finite integer in valid range
  if (
    Number.isFinite(parsed) &&
    Number.isInteger(parsed) &&
    parsed >= MIN_YEAR &&
    parsed <= MAX_YEAR
  ) {
    return parsed;
  }

  // Invalid values fall through to default
  return DEFAULT_YEAR;
}

/**
 * Safe number parsing helper - returns 0 for NaN/null/undefined/Infinity
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Safe percentage change calculation - guards against division by zero and NaN
 * Returns null for invalid calculations
 */
export function safeYoyChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Safe division helper - returns null for invalid divisions
 */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

/**
 * Validate ISO3 country code (exactly 3 uppercase letters)
 */
export function validateIso3(code: string | null): string | null {
  if (!code) return null;
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/**
 * Validate donor name parameter (non-empty, reasonable length)
 */
export function validateDonorName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 500 ? trimmed : null;
}
