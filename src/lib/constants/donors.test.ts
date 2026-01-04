import { describe, it, expect } from 'vitest';
import {
  matchesCountryConsolidation,
  matchesDonorPattern,
  isUSGovernment,
  isEUInstitution,
  isEUMember,
  OECD_DAC_PATTERNS,
  EU_MEMBER_PATTERNS,
  VALID_DONOR_FILTERS,
} from './donors';

describe('matchesCountryConsolidation', () => {
  describe('US patterns', () => {
    it('matches United States prefix', () => {
      expect(matchesCountryConsolidation('United States of America', 'US')).toBe(true);
      expect(matchesCountryConsolidation('United States Government', 'US')).toBe(true);
    });

    it('matches USAID anywhere', () => {
      expect(matchesCountryConsolidation('USAID', 'US')).toBe(true);
      expect(matchesCountryConsolidation('Some USAID Agency', 'US')).toBe(true);
    });

    it('matches U.S. anywhere', () => {
      expect(matchesCountryConsolidation('U.S. Department of State', 'US')).toBe(true);
    });

    it('does not match unrelated donors', () => {
      expect(matchesCountryConsolidation('Germany', 'US')).toBe(false);
      expect(matchesCountryConsolidation('United Kingdom', 'US')).toBe(false);
    });
  });

  describe('Germany patterns', () => {
    it('matches Germany prefix', () => {
      expect(matchesCountryConsolidation('Germany - Federal Ministry', 'Germany')).toBe(true);
    });

    it('matches Deutsche Gesellschaft', () => {
      expect(matchesCountryConsolidation('Deutsche Gesellschaft für Internationale Zusammenarbeit', 'Germany')).toBe(true);
    });

    it('matches KFW', () => {
      expect(matchesCountryConsolidation('KFW Development Bank', 'Germany')).toBe(true);
    });
  });

  it('returns false for unknown country key', () => {
    expect(matchesCountryConsolidation('Some Donor', 'Unknown')).toBe(false);
  });
});

describe('matchesDonorPattern', () => {
  it('matches donors starting with pattern', () => {
    expect(matchesDonorPattern('Germany - Federal Ministry', ['Germany'])).toBe(true);
    expect(matchesDonorPattern('France - Ministry of Foreign Affairs', ['France'])).toBe(true);
  });

  it('matches donors with pattern after comma', () => {
    expect(matchesDonorPattern('Ministry of Foreign Affairs, Germany', ['Germany'])).toBe(true);
  });

  it('matches donors with pattern in parentheses', () => {
    expect(matchesDonorPattern('Federal Ministry (Germany)', ['Germany'])).toBe(true);
  });

  it('matches donors containing pattern', () => {
    expect(matchesDonorPattern('The Germany Fund', ['Germany'])).toBe(true);
  });

  it('does not match unrelated donors', () => {
    expect(matchesDonorPattern('France - Ministry', ['Germany'])).toBe(false);
  });
});

describe('isUSGovernment', () => {
  it('returns true for donors starting with United States', () => {
    expect(isUSGovernment('United States of America')).toBe(true);
    expect(isUSGovernment('United States Government')).toBe(true);
  });

  it('returns true for donors containing USAID', () => {
    expect(isUSGovernment('USAID')).toBe(true);
    expect(isUSGovernment('Office of USAID')).toBe(true);
  });

  it('returns true for donors containing U.S.', () => {
    expect(isUSGovernment('U.S. Department of State')).toBe(true);
  });

  it('returns true for donors containing USA', () => {
    expect(isUSGovernment('Government of USA')).toBe(true);
  });

  it('returns false for non-US donors', () => {
    expect(isUSGovernment('United Kingdom')).toBe(false);
    expect(isUSGovernment('Germany')).toBe(false);
  });
});

describe('isEUInstitution', () => {
  it('returns true for donors containing European', () => {
    expect(isEUInstitution('European Commission')).toBe(true);
    expect(isEUInstitution('European Union')).toBe(true);
  });

  it('returns true for donors starting with EU ', () => {
    expect(isEUInstitution('EU Humanitarian Aid')).toBe(true);
  });

  it('returns true for donors with (EU)', () => {
    expect(isEUInstitution('Commission (EU)')).toBe(true);
  });

  it('returns false for EU member states', () => {
    expect(isEUInstitution('Germany')).toBe(false);
    expect(isEUInstitution('France')).toBe(false);
  });
});

describe('isEUMember', () => {
  it('returns true for EU member state donors', () => {
    expect(isEUMember('Germany - Federal Ministry')).toBe(true);
    expect(isEUMember('France - Ministry')).toBe(true);
    expect(isEUMember('Sweden International Development Agency')).toBe(true);
    expect(isEUMember('Italian Cooperation')).toBe(true);
  });

  it('returns true for member states in parentheses', () => {
    expect(isEUMember('Ministry (Germany)')).toBe(true);
  });

  it('returns false for non-EU donors', () => {
    expect(isEUMember('United States')).toBe(false);
    expect(isEUMember('Japan')).toBe(false);
    expect(isEUMember('Canada')).toBe(false);
  });

  it('returns false for EU institutions', () => {
    // EU institutions should be checked separately
    expect(isEUMember('European Commission')).toBe(false);
  });
});

describe('Constants', () => {
  it('OECD_DAC_PATTERNS includes major donors', () => {
    expect(OECD_DAC_PATTERNS).toContain('United States');
    expect(OECD_DAC_PATTERNS).toContain('Germany');
    expect(OECD_DAC_PATTERNS).toContain('Japan');
    expect(OECD_DAC_PATTERNS).toContain('United Kingdom');
  });

  it('EU_MEMBER_PATTERNS includes EU countries', () => {
    expect(EU_MEMBER_PATTERNS).toContain('Germany');
    expect(EU_MEMBER_PATTERNS).toContain('France');
    expect(EU_MEMBER_PATTERNS).toContain('Italy');
  });

  it('VALID_DONOR_FILTERS has all filter types', () => {
    expect(VALID_DONOR_FILTERS).toContain('all');
    expect(VALID_DONOR_FILTERS).toContain('oecd');
    expect(VALID_DONOR_FILTERS).toContain('eu_echo');
    expect(VALID_DONOR_FILTERS).toContain('us');
    expect(VALID_DONOR_FILTERS).toContain('gulf');
    expect(VALID_DONOR_FILTERS).toHaveLength(5);
  });
});
