import { describe, it, expect } from 'vitest';
import { safeNumber, safeYoyChange, safeDivide } from './numbers';

describe('safeNumber', () => {
  it('returns 0 for null', () => {
    expect(safeNumber(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(safeNumber(undefined)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(safeNumber(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(safeNumber(Infinity)).toBe(0);
    expect(safeNumber(-Infinity)).toBe(0);
  });

  it('returns the number for valid numbers', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-100)).toBe(-100);
    expect(safeNumber(3.14159)).toBe(3.14159);
  });

  it('parses string numbers', () => {
    expect(safeNumber('42')).toBe(42);
    expect(safeNumber('3.14')).toBe(3.14);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(safeNumber('abc')).toBe(0);
    expect(safeNumber('')).toBe(0);
  });

  it('handles BigInt-like values from database', () => {
    expect(safeNumber('1000000000')).toBe(1000000000);
  });
});

describe('safeYoyChange', () => {
  it('calculates positive YoY change correctly', () => {
    expect(safeYoyChange(120, 100)).toBe(20);
    expect(safeYoyChange(200, 100)).toBe(100);
  });

  it('calculates negative YoY change correctly', () => {
    expect(safeYoyChange(80, 100)).toBe(-20);
    expect(safeYoyChange(50, 100)).toBe(-50);
  });

  it('returns 0 for no change', () => {
    expect(safeYoyChange(100, 100)).toBe(0);
  });

  it('returns null for zero previous value', () => {
    expect(safeYoyChange(100, 0)).toBeNull();
  });

  it('returns null for negative previous value', () => {
    expect(safeYoyChange(100, -50)).toBeNull();
  });

  it('returns null for NaN inputs', () => {
    expect(safeYoyChange(NaN, 100)).toBeNull();
    expect(safeYoyChange(100, NaN)).toBeNull();
  });

  it('returns null for Infinity inputs', () => {
    expect(safeYoyChange(Infinity, 100)).toBeNull();
    expect(safeYoyChange(100, Infinity)).toBeNull();
  });

  it('handles decimal values', () => {
    const result = safeYoyChange(110.5, 100);
    expect(result).toBeCloseTo(10.5, 5);
  });
});

describe('safeDivide', () => {
  it('divides correctly for valid inputs', () => {
    expect(safeDivide(100, 4)).toBe(25);
    expect(safeDivide(10, 3)).toBeCloseTo(3.333, 2);
  });

  it('returns null for zero denominator', () => {
    expect(safeDivide(100, 0)).toBeNull();
  });

  it('returns null for negative denominator', () => {
    expect(safeDivide(100, -5)).toBeNull();
  });

  it('returns null for NaN inputs', () => {
    expect(safeDivide(NaN, 100)).toBeNull();
    expect(safeDivide(100, NaN)).toBeNull();
  });

  it('returns null for Infinity inputs', () => {
    expect(safeDivide(Infinity, 100)).toBeNull();
    expect(safeDivide(100, Infinity)).toBeNull();
  });

  it('handles zero numerator', () => {
    expect(safeDivide(0, 100)).toBe(0);
  });

  it('handles negative numerator with positive denominator', () => {
    expect(safeDivide(-100, 4)).toBe(-25);
  });
});
