import { describe, it, expect } from 'vitest';
import {
  calculateHHI,
  calculateNormalizedHHI,
  getConcentrationLevel,
  calculateEffectiveDonors,
  calculateGiniCoefficient,
  calculateConcentration,
  getDonorShares,
  compareConcentration,
  getConcentrationColor,
  getConcentrationDescription
} from './concentration';

describe('calculateHHI', () => {
  it('returns 0 for empty array', () => {
    expect(calculateHHI([])).toBe(0);
  });

  it('returns 10000 for single donor (monopoly)', () => {
    expect(calculateHHI([100])).toBe(10000);
  });

  it('returns ~5000 for two equal donors', () => {
    const hhi = calculateHHI([50, 50]);
    expect(hhi).toBeCloseTo(5000, 0);
  });

  it('returns ~2500 for four equal donors', () => {
    const hhi = calculateHHI([25, 25, 25, 25]);
    expect(hhi).toBeCloseTo(2500, 0);
  });

  it('returns higher HHI for unequal distribution', () => {
    const equalHHI = calculateHHI([50, 50]);
    const unequalHHI = calculateHHI([80, 20]);
    expect(unequalHHI).toBeGreaterThan(equalHHI);
  });

  it('normalizes shares if they do not sum to 100', () => {
    const hhi1 = calculateHHI([50, 50]);
    const hhi2 = calculateHHI([500, 500]);
    expect(hhi1).toBeCloseTo(hhi2, 0);
  });
});

describe('calculateNormalizedHHI', () => {
  it('returns 1 for single entity', () => {
    expect(calculateNormalizedHHI(10000, 1)).toBe(1);
  });

  it('returns 0 for equal distribution', () => {
    // 4 equal entities: HHI = 2500
    expect(calculateNormalizedHHI(2500, 4)).toBeCloseTo(0, 1);
  });

  it('returns 1 for monopoly with multiple potential players', () => {
    expect(calculateNormalizedHHI(10000, 10)).toBeCloseTo(1, 1);
  });
});

describe('getConcentrationLevel', () => {
  it('returns low for HHI < 1500', () => {
    expect(getConcentrationLevel(1000)).toBe('low');
    expect(getConcentrationLevel(1499)).toBe('low');
  });

  it('returns moderate for HHI 1500-2499', () => {
    expect(getConcentrationLevel(1500)).toBe('moderate');
    expect(getConcentrationLevel(2499)).toBe('moderate');
  });

  it('returns high for HHI 2500-4999', () => {
    expect(getConcentrationLevel(2500)).toBe('high');
    expect(getConcentrationLevel(4999)).toBe('high');
  });

  it('returns very_high for HHI >= 5000', () => {
    expect(getConcentrationLevel(5000)).toBe('very_high');
    expect(getConcentrationLevel(10000)).toBe('very_high');
  });
});

describe('calculateEffectiveDonors', () => {
  it('returns 0 for HHI = 0', () => {
    expect(calculateEffectiveDonors(0)).toBe(0);
  });

  it('returns 1 for monopoly (HHI = 10000)', () => {
    expect(calculateEffectiveDonors(10000)).toBe(1);
  });

  it('returns 2 for HHI = 5000', () => {
    expect(calculateEffectiveDonors(5000)).toBe(2);
  });

  it('returns 4 for HHI = 2500', () => {
    expect(calculateEffectiveDonors(2500)).toBe(4);
  });
});

describe('calculateGiniCoefficient', () => {
  it('returns 0 for empty array', () => {
    expect(calculateGiniCoefficient([])).toBe(0);
  });

  it('returns 0 for single value', () => {
    expect(calculateGiniCoefficient([100])).toBe(0);
  });

  it('returns 0 for equal distribution', () => {
    expect(calculateGiniCoefficient([100, 100, 100, 100])).toBeCloseTo(0, 1);
  });

  it('returns high value for unequal distribution', () => {
    const gini = calculateGiniCoefficient([1000, 10, 10, 10]);
    expect(gini).toBeGreaterThan(0.5);
  });

  it('returns value between 0 and 1', () => {
    const gini = calculateGiniCoefficient([500, 300, 150, 50]);
    expect(gini).toBeGreaterThanOrEqual(0);
    expect(gini).toBeLessThanOrEqual(1);
  });
});

describe('calculateConcentration', () => {
  it('handles empty donors array', () => {
    const result = calculateConcentration([]);
    expect(result.hhi).toBe(0);
    expect(result.concentrationLevel).toBe('low');
    expect(result.effectiveDonors).toBe(0);
  });

  it('calculates correct metrics for single donor', () => {
    const result = calculateConcentration([{ name: 'US', funding: 1000000 }]);
    expect(result.hhi).toBe(10000);
    expect(result.concentrationLevel).toBe('very_high');
    expect(result.topDonorShare).toBe(100);
    expect(result.effectiveDonors).toBe(1);
  });

  it('calculates correct metrics for equal donors', () => {
    const donors = [
      { name: 'US', funding: 250 },
      { name: 'UK', funding: 250 },
      { name: 'Germany', funding: 250 },
      { name: 'France', funding: 250 }
    ];
    const result = calculateConcentration(donors);
    expect(result.hhi).toBe(2500);
    expect(result.concentrationLevel).toBe('high');
    expect(result.topDonorShare).toBe(25);
    expect(result.top3DonorShare).toBe(75);
    expect(result.effectiveDonors).toBe(4);
  });

  it('calculates correct top donor shares', () => {
    const donors = [
      { name: 'US', funding: 500 },
      { name: 'UK', funding: 200 },
      { name: 'Germany', funding: 150 },
      { name: 'France', funding: 100 },
      { name: 'Japan', funding: 50 }
    ];
    const result = calculateConcentration(donors);
    expect(result.topDonorShare).toBe(50);
    expect(result.top3DonorShare).toBe(85);
    expect(result.top5DonorShare).toBe(100);
  });

  it('handles donors with zero funding', () => {
    const donors = [
      { name: 'US', funding: 0 },
      { name: 'UK', funding: 0 }
    ];
    const result = calculateConcentration(donors);
    expect(result.hhi).toBe(0);
    expect(result.concentrationLevel).toBe('low');
  });
});

describe('getDonorShares', () => {
  it('returns empty array for no donors', () => {
    expect(getDonorShares([])).toEqual([]);
  });

  it('returns shares sorted by funding', () => {
    const donors = [
      { name: 'UK', funding: 200 },
      { name: 'US', funding: 500 },
      { name: 'Germany', funding: 300 }
    ];
    const shares = getDonorShares(donors);
    expect(shares[0].name).toBe('US');
    expect(shares[1].name).toBe('Germany');
    expect(shares[2].name).toBe('UK');
  });

  it('calculates correct share percentages', () => {
    const donors = [
      { name: 'US', funding: 500 },
      { name: 'UK', funding: 500 }
    ];
    const shares = getDonorShares(donors);
    expect(shares[0].share).toBe(50);
    expect(shares[1].share).toBe(50);
  });

  it('respects limit parameter', () => {
    const donors = Array.from({ length: 20 }, (_, i) => ({
      name: `Donor ${i}`,
      funding: 100
    }));
    const shares = getDonorShares(donors, 5);
    expect(shares.length).toBe(5);
  });
});

describe('compareConcentration', () => {
  it('compares and sorts by HHI descending', () => {
    const entities = [
      {
        name: 'Country A',
        donors: [{ name: 'US', funding: 1000 }]  // monopoly, HHI = 10000
      },
      {
        name: 'Country B',
        donors: [
          { name: 'US', funding: 500 },
          { name: 'UK', funding: 500 }
        ]  // duopoly, HHI = 5000
      }
    ];
    const result = compareConcentration(entities);
    expect(result[0].name).toBe('Country A');
    expect(result[1].name).toBe('Country B');
    expect(result[0].concentration.hhi).toBeGreaterThan(result[1].concentration.hhi);
  });
});

describe('getConcentrationColor', () => {
  it('returns green for low concentration', () => {
    expect(getConcentrationColor('low')).toBe('#22c55e');
  });

  it('returns yellow for moderate concentration', () => {
    expect(getConcentrationColor('moderate')).toBe('#eab308');
  });

  it('returns orange for high concentration', () => {
    expect(getConcentrationColor('high')).toBe('#f97316');
  });

  it('returns red for very high concentration', () => {
    expect(getConcentrationColor('very_high')).toBe('#ef4444');
  });
});

describe('getConcentrationDescription', () => {
  it('returns appropriate descriptions', () => {
    expect(getConcentrationDescription('low')).toContain('diversification');
    expect(getConcentrationDescription('moderate')).toContain('Moderate');
    expect(getConcentrationDescription('high')).toContain('few');
    expect(getConcentrationDescription('very_high')).toContain('heavily');
  });
});
