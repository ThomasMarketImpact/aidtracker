import { describe, it, expect } from 'vitest';
import { formatMoney, formatNumber, getFundingLevel, formatYoyChange } from './format';

describe('formatMoney', () => {
  it('formats billions correctly', () => {
    expect(formatMoney(1_000_000_000)).toBe('$1.0B');
    expect(formatMoney(2_500_000_000)).toBe('$2.5B');
    expect(formatMoney(10_750_000_000)).toBe('$10.8B');
  });

  it('formats millions correctly', () => {
    expect(formatMoney(1_000_000)).toBe('$1M');
    expect(formatMoney(25_000_000)).toBe('$25M');
    expect(formatMoney(999_000_000)).toBe('$999M');
  });

  it('formats smaller amounts with locale string', () => {
    expect(formatMoney(1000)).toBe('$1,000');
    expect(formatMoney(500)).toBe('$500');
    expect(formatMoney(0)).toBe('$0');
  });
});

describe('formatNumber', () => {
  it('formats millions correctly', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000)).toBe('2.5M');
    expect(formatNumber(10_750_000)).toBe('10.8M');
  });

  it('formats thousands correctly', () => {
    expect(formatNumber(1_000)).toBe('1K');
    expect(formatNumber(25_000)).toBe('25K');
    expect(formatNumber(999_000)).toBe('999K');
  });

  it('formats smaller amounts with locale string', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('getFundingLevel', () => {
  it('returns N/A for null', () => {
    expect(getFundingLevel(null)).toEqual({ label: 'N/A', class: 'badge-neutral' });
  });

  it('returns N/A for zero', () => {
    expect(getFundingLevel(0)).toEqual({ label: 'N/A', class: 'badge-neutral' });
  });

  it('returns Well Funded for high values', () => {
    expect(getFundingLevel(150)).toEqual({ label: 'Well Funded', class: 'badge-funded-high' });
    expect(getFundingLevel(200)).toEqual({ label: 'Well Funded', class: 'badge-funded-high' });
  });

  it('returns Moderate for medium values', () => {
    expect(getFundingLevel(80)).toEqual({ label: 'Moderate', class: 'badge-funded-medium' });
    expect(getFundingLevel(100)).toEqual({ label: 'Moderate', class: 'badge-funded-medium' });
    expect(getFundingLevel(149)).toEqual({ label: 'Moderate', class: 'badge-funded-medium' });
  });

  it('returns Underfunded for low values', () => {
    expect(getFundingLevel(79)).toEqual({ label: 'Underfunded', class: 'badge-funded-low' });
    expect(getFundingLevel(50)).toEqual({ label: 'Underfunded', class: 'badge-funded-low' });
    expect(getFundingLevel(1)).toEqual({ label: 'Underfunded', class: 'badge-funded-low' });
  });
});

describe('formatYoyChange', () => {
  it('returns N/A for null', () => {
    expect(formatYoyChange(null)).toEqual({ text: 'N/A', color: '#666' });
  });

  it('formats positive changes with plus sign and green color', () => {
    expect(formatYoyChange(25)).toEqual({ text: '+25%', color: '#22c55e' });
    expect(formatYoyChange(100)).toEqual({ text: '+100%', color: '#22c55e' });
  });

  it('formats negative changes with minus sign and red color', () => {
    expect(formatYoyChange(-25)).toEqual({ text: '-25%', color: '#ef4444' });
    expect(formatYoyChange(-50)).toEqual({ text: '-50%', color: '#ef4444' });
  });

  it('formats zero as positive', () => {
    expect(formatYoyChange(0)).toEqual({ text: '+0%', color: '#22c55e' });
  });

  it('rounds decimal values', () => {
    expect(formatYoyChange(25.6)).toEqual({ text: '+26%', color: '#22c55e' });
    expect(formatYoyChange(-25.4)).toEqual({ text: '-25%', color: '#ef4444' });
  });
});
