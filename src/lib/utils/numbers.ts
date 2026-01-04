/**
 * Safe number utility functions
 * Handles NaN, null, undefined, and Infinity values gracefully
 */

/**
 * Safely parses a value to a number, returning 0 for invalid values
 * @param value - Any value to convert to a number
 * @returns A finite number, or 0 if the value is invalid
 */
export const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Calculates year-over-year percentage change safely
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change, or null if calculation is invalid
 */
export const safeYoyChange = (current: number, previous: number): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Safely divides two numbers, returning null for invalid divisions
 * @param numerator - The dividend
 * @param denominator - The divisor
 * @returns The quotient, or null if division is invalid
 */
export const safeDivide = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
};
