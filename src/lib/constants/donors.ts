/**
 * Donor classification patterns and configurations
 */

/** OECD DAC member countries for donor filtering */
export const OECD_DAC_PATTERNS = [
  'Australia', 'Austria', 'Belgium', 'Canada', 'Czech', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
  'Italy', 'Japan', 'Korea', 'Latvia', 'Lithuania', 'Luxembourg', 'Netherlands',
  'New Zealand', 'Norway', 'Poland', 'Portugal', 'Slovak', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'United Kingdom', 'United States'
] as const;

/** EU member states + ECHO (European Commission's humanitarian aid arm) */
export const EU_ECHO_PATTERNS = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech',
  'Denmark', 'Danish', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Italian', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden', 'Swedish',
  'European Commission', 'European Union', 'ECHO', 'EU '
] as const;

/** Gulf Cooperation Council States + Sovereign Wealth Funds */
export const GULF_PATTERNS = [
  'United Arab Emirates', 'UAE', 'Saudi Arabia', 'Kuwait',
  'Qatar', 'Bahrain', 'Oman', 'Abu Dhabi', 'Dubai',
  'Abu Dhabi Fund', 'Kuwait Fund', 'Saudi Fund', 'Qatar Fund',
  'Islamic Development Bank', 'OPEC Fund'
] as const;

/** EU member state patterns for grouping */
export const EU_MEMBER_PATTERNS = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech',
  'Denmark', 'Danish', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Italian', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden', 'Swedish'
] as const;

/** Donor filter type */
export type DonorFilter = 'all' | 'oecd' | 'eu_echo' | 'us' | 'gulf';

/** Valid donor filter values for validation */
export const VALID_DONOR_FILTERS: DonorFilter[] = ['all', 'oecd', 'eu_echo', 'us', 'gulf'];

/** Country consolidation configuration */
export interface CountryConsolidationConfig {
  displayName: string;
  patterns: string[];
  color: string;
}

/** Countries with multiple government funding bodies that should be consolidated */
export const COUNTRY_CONSOLIDATION_CONFIG: Record<string, CountryConsolidationConfig> = {
  'US': {
    displayName: 'United States (All Agencies)',
    patterns: ['United States%', '%USAID%', '%U.S.%'],
    color: '#3b82f6',
  },
  'Sweden': {
    displayName: 'Sweden (All Agencies)',
    patterns: ['Sweden%', 'Swedish%', '%SIDA%'],
    color: '#fbbf24',
  },
  'UAE': {
    displayName: 'UAE (All Agencies)',
    patterns: ['United Arab Emirates%', 'UAE%'],
    color: '#10b981',
  },
  'Germany': {
    displayName: 'Germany (All Agencies)',
    patterns: ['Germany%', 'Deutsche Gesellschaft%', 'KFW%'],
    color: '#000000',
  },
  'Italy': {
    displayName: 'Italy (All Agencies)',
    patterns: ['Italy%', 'Italian%'],
    color: '#22c55e',
  },
  'Switzerland': {
    displayName: 'Switzerland (All Agencies)',
    patterns: ['Switzerland%', 'Swiss%'],
    color: '#ef4444',
  },
  'Qatar': {
    displayName: 'Qatar (All Agencies)',
    patterns: ['Qatar%'],
    color: '#7c2d12',
  },
};

/** All consolidation country keys */
export const CONSOLIDATION_COUNTRIES = Object.keys(COUNTRY_CONSOLIDATION_CONFIG);

/**
 * Check if a donor matches any consolidation pattern for a country
 */
export const matchesCountryConsolidation = (donor: string, countryKey: string): boolean => {
  const config = COUNTRY_CONSOLIDATION_CONFIG[countryKey];
  if (!config) return false;
  return config.patterns.some(pattern => {
    if (pattern.startsWith('%') && pattern.endsWith('%')) {
      return donor.includes(pattern.slice(1, -1));
    } else if (pattern.endsWith('%')) {
      return donor.startsWith(pattern.slice(0, -1));
    } else if (pattern.startsWith('%')) {
      return donor.endsWith(pattern.slice(1));
    }
    return donor === pattern;
  });
};

/**
 * Check if donor matches a pattern list
 */
export const matchesDonorPattern = (donor: string, patterns: readonly string[]): boolean => {
  return patterns.some(pattern =>
    donor.startsWith(pattern) ||
    donor.includes(`, ${pattern}`) ||
    donor.includes(`(${pattern}`) ||
    donor.includes(pattern)
  );
};

/**
 * Check if donor is US Government
 */
export const isUSGovernment = (donor: string): boolean => {
  return donor.startsWith('United States') ||
    donor.includes('U.S.') ||
    donor.includes('USA') ||
    donor.includes('USAID');
};

/**
 * Check if donor is EU Institution
 */
export const isEUInstitution = (donor: string): boolean => {
  return donor.includes('European') ||
    donor.startsWith('EU ') ||
    donor.includes('(EU)');
};

/**
 * Check if donor is EU Member state
 */
export const isEUMember = (donor: string): boolean => {
  return EU_MEMBER_PATTERNS.some(pattern =>
    donor.startsWith(pattern) ||
    donor.includes(`, ${pattern}`) ||
    donor.includes(`(${pattern}`)
  );
};
