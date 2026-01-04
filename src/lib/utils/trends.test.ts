import { describe, it, expect } from 'vitest';
import {
  calculateCAGR,
  calculateAverageGrowthRate,
  calculateLinearRegression,
  projectNextValue,
  calculateVolatility,
  getTrendDirection,
  classifyTrend,
  analyzeTrend,
  getTrendIndicator,
  getTrendColor,
} from './trends';

describe('calculateCAGR', () => {
  it('calculates correct CAGR for growth', () => {
    // $100 to $200 in 5 years = ~14.87% CAGR
    const result = calculateCAGR(100, 200, 5);
    expect(result).toBeCloseTo(14.87, 1);
  });

  it('calculates correct CAGR for decline', () => {
    // $200 to $100 in 5 years = ~-12.94% CAGR
    const result = calculateCAGR(200, 100, 5);
    expect(result).toBeCloseTo(-12.94, 1);
  });

  it('returns null for zero start value', () => {
    expect(calculateCAGR(0, 100, 5)).toBeNull();
  });

  it('returns null for zero years', () => {
    expect(calculateCAGR(100, 200, 0)).toBeNull();
  });
});

describe('calculateAverageGrowthRate', () => {
  it('calculates average growth rate correctly', () => {
    const values = [100, 110, 121]; // 10% growth each year
    const result = calculateAverageGrowthRate(values);
    expect(result).toBeCloseTo(10, 1);
  });

  it('handles mixed growth and decline', () => {
    const values = [100, 120, 100]; // +20%, -16.67%
    const result = calculateAverageGrowthRate(values);
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(1.67, 0);
  });

  it('returns null for single value', () => {
    expect(calculateAverageGrowthRate([100])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(calculateAverageGrowthRate([])).toBeNull();
  });
});

describe('calculateLinearRegression', () => {
  it('calculates slope and intercept correctly', () => {
    const values = [100, 200, 300, 400]; // Linear increase of 100
    const result = calculateLinearRegression(values);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(100, 0);
    expect(result!.intercept).toBeCloseTo(100, 0);
  });

  it('returns null for single value', () => {
    expect(calculateLinearRegression([100])).toBeNull();
  });
});

describe('projectNextValue', () => {
  it('projects next value correctly', () => {
    const values = [100, 200, 300]; // Linear trend
    const result = projectNextValue(values);
    expect(result).toBeCloseTo(400, 0);
  });

  it('returns null for insufficient data', () => {
    expect(projectNextValue([100])).toBeNull();
  });
});

describe('calculateVolatility', () => {
  it('returns low volatility for consistent growth', () => {
    const values = [100, 110, 121, 133]; // Consistent 10% growth
    const result = calculateVolatility(values);
    expect(result).toBeLessThan(2);
  });

  it('returns higher volatility for inconsistent data', () => {
    const values = [100, 150, 110, 180]; // Highly variable
    const result = calculateVolatility(values);
    expect(result).toBeGreaterThan(20);
  });

  it('returns null for insufficient data', () => {
    expect(calculateVolatility([100, 200])).toBeNull();
  });
});

describe('getTrendDirection', () => {
  it('returns up for increasing trend', () => {
    expect(getTrendDirection([100, 110, 120])).toBe('up');
  });

  it('returns down for decreasing trend', () => {
    expect(getTrendDirection([120, 110, 100])).toBe('down');
  });

  it('returns stable for flat trend', () => {
    expect(getTrendDirection([100, 101, 102])).toBe('stable');
  });

  it('returns stable for single value', () => {
    expect(getTrendDirection([100])).toBe('stable');
  });
});

describe('classifyTrend', () => {
  it('classifies strong growth', () => {
    expect(classifyTrend(15)).toBe('strong_growth');
  });

  it('classifies moderate growth', () => {
    expect(classifyTrend(5)).toBe('moderate_growth');
  });

  it('classifies stable', () => {
    expect(classifyTrend(0)).toBe('stable');
  });

  it('classifies moderate decline', () => {
    expect(classifyTrend(-5)).toBe('moderate_decline');
  });

  it('classifies strong decline', () => {
    expect(classifyTrend(-15)).toBe('strong_decline');
  });

  it('returns stable for null', () => {
    expect(classifyTrend(null)).toBe('stable');
  });
});

describe('analyzeTrend', () => {
  it('returns comprehensive analysis', () => {
    const data = {
      values: [100, 110, 121, 133, 146],
      years: [2020, 2021, 2022, 2023, 2024],
    };

    const result = analyzeTrend(data);

    expect(result.direction).toBe('up');
    expect(result.averageGrowthRate).toBeCloseTo(10, 0);
    expect(result.cagr).toBeCloseTo(10, 0);
    expect(result.linearProjection).toBeGreaterThan(150);
    expect(result.trend).toBe('moderate_growth');
  });

  it('handles declining trend', () => {
    const data = {
      values: [200, 190, 180, 175],
      years: [2020, 2021, 2022, 2023],
    };

    const result = analyzeTrend(data);

    expect(result.direction).toBe('down');
    expect(result.averageGrowthRate).toBeLessThan(0);
    expect(result.trend).toBe('moderate_decline');
  });
});

describe('getTrendIndicator', () => {
  it('returns double up arrow for strong growth', () => {
    expect(getTrendIndicator('strong_growth')).toBe('\u2191\u2191');
  });

  it('returns right arrow for stable', () => {
    expect(getTrendIndicator('stable')).toBe('\u2192');
  });
});

describe('getTrendColor', () => {
  it('returns positive for growth', () => {
    expect(getTrendColor('strong_growth')).toBe('positive');
    expect(getTrendColor('moderate_growth')).toBe('positive');
  });

  it('returns neutral for stable', () => {
    expect(getTrendColor('stable')).toBe('neutral');
  });

  it('returns negative for decline', () => {
    expect(getTrendColor('moderate_decline')).toBe('negative');
    expect(getTrendColor('strong_decline')).toBe('negative');
  });
});
