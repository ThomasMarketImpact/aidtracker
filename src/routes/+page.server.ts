import { db, schema } from '$lib/server/db';
import { sql, desc, eq, sum, lte } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type {
  FundingTrendRow,
  CountryFundingByYearRow,
  CountryFundingRow,
  DonorRow,
  DonorFundingRow,
  ConsolidatedCountryFundingRow,
  DonorTypeRow,
  SectorRow,
  CountryHistoryRow,
  CountryDonorRow,
  CountrySectorRow,
  DonorInfoRow,
  DonorHistoryRow,
  DonorFlowRow,
  DonorSectorRow,
} from '$lib/types/database';
import {
  parseYear,
  safeNumber,
  safeYoyChange,
  safeDivide,
  validateIso3,
  validateDonorName,
  MAX_YEAR,
} from '$lib/utils/validation';

// US CPI annual averages (BLS CPI-U) - used to convert to 2025 USD
// Source: Bureau of Labor Statistics, with 2024-2025 estimated
const CPI_DATA: Record<number, number> = {
  2016: 240.0,
  2017: 245.1,
  2018: 251.1,
  2019: 255.7,
  2020: 258.8,
  2021: 271.0,
  2022: 292.7,
  2023: 304.7,
  2024: 314.5,  // Estimated
  2025: 320.8,  // Estimated (~2% inflation)
};

// Global People in Need by year - from OCHA Global Humanitarian Overview reports
// Source: https://humanitarianaction.info / GHO annual reports
const GHO_PEOPLE_IN_NEED: Record<number, number> = {
  2016: 130_900_000,   // GHO 2016
  2017: 141_100_000,   // GHO 2017
  2018: 135_700_000,   // GHO 2018
  2019: 131_700_000,   // GHO 2019
  2020: 167_600_000,   // GHO 2020 (COVID-19 impact)
  2021: 235_000_000,   // GHO 2021
  2022: 274_000_000,   // GHO 2022
  2023: 339_000_000,   // GHO 2023
  2024: 300_000_000,   // GHO 2024
  2025: 305_000_000,   // GHO 2025
};

// Calculate multiplier to convert past year's USD to 2025 USD
function getInflationMultiplier(year: number): number {
  const baseCpi = CPI_DATA[2025] || 320.8;
  const yearCpi = CPI_DATA[year] || baseCpi;
  return baseCpi / yearCpi;
}

// OECD DAC member countries for donor filtering
const OECD_DAC_PATTERNS = [
  'Australia', 'Austria', 'Belgium', 'Canada', 'Czech', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
  'Italy', 'Japan', 'Korea', 'Latvia', 'Lithuania', 'Luxembourg', 'Netherlands',
  'New Zealand', 'Norway', 'Poland', 'Portugal', 'Slovak', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'United Kingdom', 'United States'
];

// EU member states + ECHO (European Commission's humanitarian aid arm)
const EU_ECHO_PATTERNS = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech',
  'Denmark', 'Danish', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Italian', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden', 'Swedish',
  'European Commission', 'European Union', 'ECHO', 'EU '
];

// Gulf Cooperation Council States + Sovereign Wealth Funds
const GULF_PATTERNS = [
  'United Arab Emirates', 'UAE', 'Saudi Arabia', 'Kuwait',
  'Qatar', 'Bahrain', 'Oman', 'Abu Dhabi', 'Dubai',
  'Abu Dhabi Fund', 'Kuwait Fund', 'Saudi Fund', 'Qatar Fund',
  'Islamic Development Bank', 'OPEC Fund'
];

// Donor filter types
export type DonorFilter = 'all' | 'oecd' | 'eu_echo' | 'us' | 'gulf';

// Countries with multiple government funding bodies that should be consolidated
// Key = consolidated display name, value = SQL LIKE patterns to match
const COUNTRY_CONSOLIDATION_CONFIG: Record<string, { displayName: string; patterns: string[]; color: string }> = {
  'US': {
    displayName: 'United States (All Agencies)',
    patterns: ['United States%', '%USAID%', '%U.S.%'],
    color: '#3b82f6', // Blue
  },
  'Sweden': {
    displayName: 'Sweden (All Agencies)',
    patterns: ['Sweden%', 'Swedish%', '%SIDA%'],
    color: '#fbbf24', // Yellow
  },
  'UAE': {
    displayName: 'UAE (All Agencies)',
    patterns: ['United Arab Emirates%', 'UAE%'],
    color: '#10b981', // Green
  },
  'Germany': {
    displayName: 'Germany (All Agencies)',
    patterns: ['Germany%', 'Deutsche Gesellschaft%', 'KFW%'],
    color: '#000000', // Black
  },
  'Italy': {
    displayName: 'Italy (All Agencies)',
    patterns: ['Italy%', 'Italian%'],
    color: '#22c55e', // Green
  },
  'Switzerland': {
    displayName: 'Switzerland (All Agencies)',
    patterns: ['Switzerland%', 'Swiss%'],
    color: '#ef4444', // Red
  },
  'Qatar': {
    displayName: 'Qatar (All Agencies)',
    patterns: ['Qatar%'],
    color: '#7c2d12', // Maroon
  },
};

// Helper to check if a donor matches any consolidation pattern for a country
const matchesCountryConsolidation = (donor: string, countryKey: string): boolean => {
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

// Get all consolidation country keys
const CONSOLIDATION_COUNTRIES = Object.keys(COUNTRY_CONSOLIDATION_CONFIG);

// Helper to check if donor matches a pattern list
const matchesDonorPattern = (donor: string, patterns: string[]): boolean => {
  return patterns.some(pattern =>
    donor.startsWith(pattern) ||
    donor.includes(`, ${pattern}`) ||
    donor.includes(`(${pattern}`) ||
    donor.includes(pattern)
  );
};

export const load: PageServerLoad = async ({ url }) => {
  // Parse and validate parameters using shared validation utilities
  const selectedYear = parseYear(url.searchParams.get('year'));
  const selectedCountry = validateIso3(url.searchParams.get('country'));
  const selectedDonor = validateDonorName(url.searchParams.get('donor'));

  // Validate donor filter - must be one of the allowed values to prevent SQL injection
  const VALID_DONOR_FILTERS: DonorFilter[] = ['all', 'oecd', 'eu_echo', 'us', 'gulf'];
  const donorFilterParam = url.searchParams.get('donorFilter');
  const donorFilter: DonorFilter = donorFilterParam && VALID_DONOR_FILTERS.includes(donorFilterParam as DonorFilter)
    ? donorFilterParam as DonorFilter
    : 'all';

  try {
  // Run independent queries in parallel for better performance
  const [fundingByYear, fundingTrend] = await Promise.all([
    // Get all years with funding data (up to 2025 - 2026 data is incomplete)
    db.select({
      year: schema.flowSummaries.year,
      totalUsd: sum(schema.flowSummaries.totalAmountUsd),
      flowCount: sum(schema.flowSummaries.flowCount),
    })
    .from(schema.flowSummaries)
    .where(lte(schema.flowSummaries.year, 2025))
    .groupBy(schema.flowSummaries.year)
    .orderBy(desc(schema.flowSummaries.year)),

    // Get funding trend data (all years up to 2025, for line chart)
    // Note: 2026 data excluded as funding figures are incomplete/misleading
    db.execute(sql`
      SELECT
        fs.year,
        SUM(fs.total_amount_usd::numeric) as total_funding,
        COUNT(DISTINCT fs.recipient_country_id) as countries_funded
      FROM flow_summaries fs
      WHERE fs.year <= 2025
      GROUP BY fs.year
      ORDER BY fs.year ASC
    `)
  ]);

  // GHO 2024 People in Need by country (millions) - for countries missing from HAPI
  const GHO_PIN_BY_COUNTRY: Record<string, number> = {
    'PSE': 3_000_000,      // Occupied Palestinian Territory
    'LBN': 3_000_000,      // Lebanon
    'HTI': 5_500_000,      // Haiti
    'MMR': 18_600_000,     // Myanmar
    'PAK': 10_000_000,     // Pakistan
    'BGD': 2_000_000,      // Bangladesh (Rohingya crisis)
    'MOZ': 3_000_000,      // Mozambique
    'BFA': 6_300_000,      // Burkina Faso
    'MLI': 8_800_000,      // Mali
    'NER': 4_300_000,      // Niger
    'CMR': 4_700_000,      // Cameroon
    'CAF': 3_400_000,      // Central African Republic
    'VEN': 7_700_000,      // Venezuela
    'COL': 8_300_000,      // Colombia
    'ZWE': 7_700_000,      // Zimbabwe
    'IRQ': 2_500_000,      // Iraq
  };

  // Build donor filter SQL condition
  // SECURITY: This is safe because:
  // 1. `filter` is validated against VALID_DONOR_FILTERS whitelist before reaching here
  // 2. All pattern arrays (OECD_DAC_PATTERNS, etc.) are hardcoded constants, not user input
  // 3. The switch only produces SQL from these fixed, trusted values
  const buildDonorFilterCondition = (filter: DonorFilter): string => {
    switch (filter) {
      case 'us':
        return `(o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%')`;
      case 'oecd':
        return `(${OECD_DAC_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
      case 'eu_echo':
        return `(${EU_ECHO_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
      case 'gulf':
        return `(${GULF_PATTERNS.map(p => `o.name LIKE '%${p}%'`).join(' OR ')})`;
      default:
        return '1=1';
    }
  };

  // Get funding by year for top 15 recipient countries (for multi-line chart)
  // Filtered by donor group if a filter is selected
  // Note: 2026 data excluded as funding figures are incomplete
  let countryFundingByYear;
  if (donorFilter === 'all') {
    countryFundingByYear = await db.execute(sql`
      WITH top_countries AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as total_funding
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year >= 2016 AND fs.year <= 2025
        GROUP BY c.id, c.name, c.iso3
        ORDER BY total_funding DESC
        LIMIT 15
      )
      SELECT
        tc.name,
        tc.iso3,
        fs.year,
        SUM(fs.total_amount_usd::numeric) as funding
      FROM top_countries tc
      JOIN flow_summaries fs ON fs.recipient_country_id = tc.id
      WHERE fs.year >= 2016 AND fs.year <= 2025
      GROUP BY tc.name, tc.iso3, fs.year
      ORDER BY tc.name, fs.year
    `);
  } else {
    // Query with donor filter
    const filterCondition = buildDonorFilterCondition(donorFilter);
    countryFundingByYear = await db.execute(sql.raw(`
      WITH top_countries AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as total_funding
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year >= 2016 AND fs.year <= 2025 AND ${filterCondition}
        GROUP BY c.id, c.name, c.iso3
        ORDER BY total_funding DESC
        LIMIT 15
      )
      SELECT
        tc.name,
        tc.iso3,
        fs.year,
        SUM(fs.total_amount_usd::numeric) as funding
      FROM top_countries tc
      JOIN flow_summaries fs ON fs.recipient_country_id = tc.id
      JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year >= 2016 AND fs.year <= 2025 AND ${filterCondition}
      GROUP BY tc.name, tc.iso3, fs.year
      ORDER BY tc.name, fs.year
    `));
  }

  // Get top recipient countries for selected year with needs data and YoY change
  // When donorFilter is set, filter by specific donor organizations
  let countriesData;
  if (donorFilter === 'all') {
    countriesData = await db.execute(sql`
      WITH current_funding AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year = ${selectedYear}
        GROUP BY c.id, c.name, c.iso3
      ),
      prev_funding AS (
        SELECT
          c.id,
          SUM(fs.total_amount_usd::numeric) as prev_funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year = ${selectedYear - 1}
        GROUP BY c.id
      ),
      needs AS (
        SELECT
          c.id as country_id,
          MAX(CASE WHEN hn.year = 2025 THEN hn.people_in_need ELSE NULL END) as pin_2025,
          MAX(CASE WHEN hn.year = 2024 THEN hn.people_in_need ELSE NULL END) as pin_2024
        FROM humanitarian_needs hn
        JOIN countries c ON c.id = hn.country_id
        JOIN sectors s ON s.id = hn.sector_id
        WHERE s.code = 'Intersectoral'
        GROUP BY c.id
      )
      SELECT
        cf.id,
        cf.name,
        cf.iso3,
        cf.funding_usd,
        cf.flow_count,
        pf.prev_funding_usd,
        COALESCE(n.pin_2025, n.pin_2024) as people_in_need,
        CASE
          WHEN COALESCE(n.pin_2025, n.pin_2024) > 0
          THEN cf.funding_usd / COALESCE(n.pin_2025, n.pin_2024)
          ELSE NULL
        END as funding_per_person
      FROM current_funding cf
      LEFT JOIN prev_funding pf ON pf.id = cf.id
      LEFT JOIN needs n ON n.country_id = cf.id
      ORDER BY cf.funding_usd DESC
    `);
  } else {
    // Query with donor filter - filter funding by specific donor groups
    const filterCondition = buildDonorFilterCondition(donorFilter);
    countriesData = await db.execute(sql.raw(`
      WITH current_funding AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year = ${selectedYear}
          AND ${filterCondition}
        GROUP BY c.id, c.name, c.iso3
      ),
      prev_funding AS (
        SELECT
          c.id,
          SUM(fs.total_amount_usd::numeric) as prev_funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year = ${selectedYear - 1}
          AND ${filterCondition}
        GROUP BY c.id
      ),
      needs AS (
        SELECT
          c.id as country_id,
          MAX(CASE WHEN hn.year = 2025 THEN hn.people_in_need ELSE NULL END) as pin_2025,
          MAX(CASE WHEN hn.year = 2024 THEN hn.people_in_need ELSE NULL END) as pin_2024
        FROM humanitarian_needs hn
        JOIN countries c ON c.id = hn.country_id
        JOIN sectors s ON s.id = hn.sector_id
        WHERE s.code = 'Intersectoral'
        GROUP BY c.id
      )
      SELECT
        cf.id,
        cf.name,
        cf.iso3,
        cf.funding_usd,
        cf.flow_count,
        pf.prev_funding_usd,
        COALESCE(n.pin_2025, n.pin_2024) as people_in_need,
        CASE
          WHEN COALESCE(n.pin_2025, n.pin_2024) > 0
          THEN cf.funding_usd / COALESCE(n.pin_2025, n.pin_2024)
          ELSE NULL
        END as funding_per_person
      FROM current_funding cf
      LEFT JOIN prev_funding pf ON pf.id = cf.id
      LEFT JOIN needs n ON n.country_id = cf.id
      ORDER BY cf.funding_usd DESC
    `));
  }

  // EU member states for grouping (match start of name)
  const EU_MEMBER_PATTERNS = [
    'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech',
    'Denmark', 'Danish', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
    'Ireland', 'Italy', 'Italian', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
    'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden', 'Swedish'
  ];

  // Helper to check if donor is EU member state
  const isEUMember = (donor: string): boolean => {
    return EU_MEMBER_PATTERNS.some(pattern => donor.startsWith(pattern) || donor.includes(`, ${pattern}`) || donor.includes(`(${pattern}`));
  };

  // Helper to check if donor is US
  const isUSGovernment = (donor: string): boolean => {
    return donor.startsWith('United States') || donor.includes('U.S.') || donor.includes('USA') || donor.includes('USAID');
  };

  // Helper to check if EU institution
  const isEUInstitution = (donor: string): boolean => {
    return donor.includes('European') || donor.startsWith('EU ') || donor.includes('(EU)');
  };

  // Run year-dependent queries in parallel for better performance
  const [sectorData, donorData, consolidatedCountryFunding, donorTypeData, topGovernmentDonorsRaw, prevYearGovernmentDonors] = await Promise.all([
    // Get sector breakdown for selected year
    db.execute(sql`
      SELECT
        COALESCE(s.name, 'Unspecified') as sector,
        SUM(fs.total_amount_usd::numeric) as funding_usd,
        SUM(fs.flow_count) as flow_count
      FROM flow_summaries fs
      LEFT JOIN sectors s ON s.id = fs.sector_id
      WHERE fs.year = ${selectedYear}
      GROUP BY s.name
      ORDER BY funding_usd DESC
      LIMIT 15
    `),

    // Get top donors for selected year
    db.execute(sql`
      SELECT
        COALESCE(o.name, 'Unknown') as donor,
        COALESCE(o.org_type, 'Unknown') as donor_type,
        SUM(fs.total_amount_usd::numeric) as funding_usd,
        COUNT(DISTINCT fs.recipient_country_id) as countries_funded
      FROM flow_summaries fs
      LEFT JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year = ${selectedYear}
      GROUP BY o.name, o.org_type
      ORDER BY funding_usd DESC
      LIMIT 20
    `),

    // Get consolidated funding for all countries with multiple agencies
    db.execute(sql`
      SELECT
        CASE
          WHEN o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%' THEN 'US'
          WHEN o.name LIKE 'Sweden%' OR o.name LIKE 'Swedish%' OR o.name LIKE '%SIDA%' THEN 'Sweden'
          WHEN o.name LIKE 'United Arab Emirates%' OR o.name LIKE 'UAE%' THEN 'UAE'
          WHEN o.name LIKE 'Germany%' OR o.name LIKE 'Deutsche Gesellschaft%' OR o.name LIKE 'KFW%' THEN 'Germany'
          WHEN o.name LIKE 'Italy%' OR o.name LIKE 'Italian%' THEN 'Italy'
          WHEN o.name LIKE 'Switzerland%' OR o.name LIKE 'Swiss%' THEN 'Switzerland'
          WHEN o.name LIKE 'Qatar%' THEN 'Qatar'
        END as country_key,
        SUM(fs.total_amount_usd::numeric) as funding_usd,
        COUNT(DISTINCT fs.recipient_country_id) as countries_funded
      FROM flow_summaries fs
      LEFT JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year = ${selectedYear}
        AND (
          o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%'
          OR o.name LIKE 'Sweden%' OR o.name LIKE 'Swedish%' OR o.name LIKE '%SIDA%'
          OR o.name LIKE 'United Arab Emirates%' OR o.name LIKE 'UAE%'
          OR o.name LIKE 'Germany%' OR o.name LIKE 'Deutsche Gesellschaft%' OR o.name LIKE 'KFW%'
          OR o.name LIKE 'Italy%' OR o.name LIKE 'Italian%'
          OR o.name LIKE 'Switzerland%' OR o.name LIKE 'Swiss%'
          OR o.name LIKE 'Qatar%'
        )
      GROUP BY country_key
    `),

    // Get funding by donor type
    db.execute(sql`
      SELECT
        COALESCE(o.org_type, 'Unknown') as donor_type,
        SUM(fs.total_amount_usd::numeric) as funding_usd
      FROM flow_summaries fs
      LEFT JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year = ${selectedYear}
      GROUP BY o.org_type
      ORDER BY funding_usd DESC
    `),

    // Get all government donors for current year
    db.execute(sql`
      SELECT
        COALESCE(o.name, 'Unknown') as donor,
        SUM(fs.total_amount_usd::numeric) as funding_usd
      FROM flow_summaries fs
      LEFT JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year = ${selectedYear}
        AND o.org_type = 'Governments'
      GROUP BY o.name
      ORDER BY funding_usd DESC
    `),

    // Get previous year's government donors for YoY comparison
    db.execute(sql`
      SELECT
        COALESCE(o.name, 'Unknown') as donor,
        SUM(fs.total_amount_usd::numeric) as funding_usd
      FROM flow_summaries fs
      LEFT JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year = ${selectedYear - 1}
        AND o.org_type = 'Governments'
      GROUP BY o.name
    `)
  ]);

  // Process and group donors
  const processGovernmentDonors = () => {
    // Build previous year lookup with safe Number conversion
    const prevYearMap = new Map<string, number>();
    (prevYearGovernmentDonors.rows as unknown as DonorFundingRow[]).forEach((r) => {
      const funding = safeNumber(r.funding_usd);
      if (Number.isFinite(funding)) {
        prevYearMap.set(r.donor, funding);
      }
    });

    // Aggregate totals
    let usTotal = 0, usPrevTotal = 0;
    let euMemberTotal = 0, euMemberPrevTotal = 0;
    let euInstitutionTotal = 0, euInstitutionPrevTotal = 0;
    const others: { donor: string; funding: number; prevFunding: number }[] = [];

    // Track individual breakdowns for US and EU
    const usAgencies: { donor: string; funding: number; prevFunding: number }[] = [];
    const euMemberStates: { donor: string; funding: number; prevFunding: number }[] = [];

    (topGovernmentDonorsRaw.rows as unknown as DonorFundingRow[]).forEach((r) => {
      const donor = r.donor;
      if (!donor) return; // Skip rows with null/undefined donors
      const funding = safeNumber(r.funding_usd);
      if (!Number.isFinite(funding)) return; // Skip invalid funding values
      const prevFunding = prevYearMap.get(donor) || 0;

      if (isUSGovernment(donor)) {
        usTotal += funding;
        usPrevTotal += prevFunding;
        usAgencies.push({ donor, funding, prevFunding });
      } else if (isEUInstitution(donor)) {
        euInstitutionTotal += funding;
        euInstitutionPrevTotal += prevFunding;
      } else if (isEUMember(donor)) {
        euMemberTotal += funding;
        euMemberPrevTotal += prevFunding;
        euMemberStates.push({ donor, funding, prevFunding });
      } else {
        others.push({ donor, funding, prevFunding });
      }
    });

    // Build final result
    const result: { donor: string; funding: number; prevFunding: number; category: string }[] = [];

    if (usTotal > 0) {
      result.push({ donor: 'United States (All)', funding: usTotal, prevFunding: usPrevTotal, category: 'US' });
    }

    if (euInstitutionTotal > 0) {
      result.push({ donor: 'European Union (Institutions)', funding: euInstitutionTotal, prevFunding: euInstitutionPrevTotal, category: 'EU' });
    }

    if (euMemberTotal > 0) {
      result.push({ donor: 'EU Member States (Combined)', funding: euMemberTotal, prevFunding: euMemberPrevTotal, category: 'EU' });
    }

    others.forEach(o => {
      result.push({ ...o, category: 'Other' });
    });

    // Sort by funding and take top 12
    const topDonors = result.sort((a, b) => b.funding - a.funding).slice(0, 12);

    // Sort breakdowns by funding
    usAgencies.sort((a, b) => b.funding - a.funding);
    euMemberStates.sort((a, b) => b.funding - a.funding);

    return { topDonors, usAgencies, euMemberStates };
  };

  const { topDonors: topGovernmentDonors, usAgencies, euMemberStates } = processGovernmentDonors();

  // Create consolidated donor data (combining multiple agencies per country)
  const createConsolidatedDonorData = () => {
    // Build lookup of consolidated country totals with safe Number conversion
    const consolidatedTotals = new Map<string, { funding: number; countries: number }>();
    (consolidatedCountryFunding.rows as unknown as ConsolidatedCountryFundingRow[]).forEach((r) => {
      if (r.country_key) {
        const funding = safeNumber(r.funding_usd);
        const countries = safeNumber(r.countries_funded);
        if (Number.isFinite(funding) && Number.isFinite(countries)) {
          consolidatedTotals.set(r.country_key, { funding, countries });
        }
      }
    });

    // Filter out donors that belong to any consolidated country
    const nonConsolidatedDonors = (donorData.rows as unknown as DonorRow[]).filter((r) => {
      const donor = r.donor;
      if (!donor) return false; // Skip null/undefined donors
      for (const countryKey of CONSOLIDATION_COUNTRIES) {
        if (matchesCountryConsolidation(donor, countryKey)) {
          return false;
        }
      }
      return true;
    });

    // Create the consolidated list
    const consolidated: { donor: string; donorType: string; funding: number; countriesFunded: number; isConsolidated?: boolean; countryKey?: string }[] = [];

    // Add consolidated entries for each country with funding
    for (const [countryKey, config] of Object.entries(COUNTRY_CONSOLIDATION_CONFIG)) {
      const totals = consolidatedTotals.get(countryKey);
      if (totals && totals.funding > 0 && Number.isFinite(totals.funding)) {
        consolidated.push({
          donor: config.displayName,
          donorType: 'Governments',
          funding: totals.funding,
          countriesFunded: totals.countries,
          isConsolidated: true,
          countryKey,
        });
      }
    }

    // Add non-consolidated donors with safe Number conversion
    nonConsolidatedDonors.forEach((r) => {
      const funding = safeNumber(r.funding_usd);
      const countriesFunded = safeNumber(r.countries_funded);
      if (!Number.isFinite(funding)) return; // Skip invalid values
      consolidated.push({
        donor: r.donor,
        donorType: r.donor_type || 'Unknown',
        funding,
        countriesFunded,
        isConsolidated: false,
      });
    });

    // Sort by funding and take top 15
    return consolidated.sort((a, b) => b.funding - a.funding).slice(0, 15);
  };

  const consolidatedDonorData = createConsolidatedDonorData();

  // Get breakdown data for each consolidated country (for modal display)
  const countryAgenciesBreakdown: Record<string, { donor: string; funding: number; prevFunding: number; yoyChange: number | null }[]> = {};

  // Process government donors to extract breakdowns by country with safe Number conversion
  const prevYearMapForBreakdown = new Map<string, number>();
  (prevYearGovernmentDonors.rows as unknown as DonorFundingRow[]).forEach((r) => {
    const funding = safeNumber(r.funding_usd);
    if (r.donor && Number.isFinite(funding)) {
      prevYearMapForBreakdown.set(r.donor, funding);
    }
  });

  for (const countryKey of CONSOLIDATION_COUNTRIES) {
    const agencies: { donor: string; funding: number; prevFunding: number; yoyChange: number | null }[] = [];

    (topGovernmentDonorsRaw.rows as unknown as DonorFundingRow[]).forEach((r) => {
      const donor = r.donor;
      if (matchesCountryConsolidation(donor, countryKey)) {
        const funding = safeNumber(r.funding_usd);
        const prevFunding = prevYearMapForBreakdown.get(donor) || 0;
        // Use the safeYoyChange helper for consistent calculation
        const yoyChange = safeYoyChange(funding, prevFunding);
        agencies.push({
          donor,
          funding,
          prevFunding,
          yoyChange,
        });
      }
    });

    // Sort by funding
    agencies.sort((a, b) => b.funding - a.funding);
    countryAgenciesBreakdown[countryKey] = agencies;
  }

  // Country detail data if a country is selected
  let countryDetail = null;
  if (selectedCountry) {
    // Run country detail queries in parallel
    const [countryHistory, countryDonors, countrySectors] = await Promise.all([
      db.execute(sql`
        SELECT
          fs.year,
          SUM(fs.total_amount_usd::numeric) as funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE c.iso3 = ${selectedCountry} AND fs.year <= 2025
        GROUP BY fs.year
        ORDER BY fs.year ASC
      `),

      db.execute(sql`
        SELECT
          COALESCE(o.name, 'Unknown') as donor,
          SUM(fs.total_amount_usd::numeric) as funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        LEFT JOIN organizations o ON o.id = fs.donor_org_id
        WHERE c.iso3 = ${selectedCountry} AND fs.year = ${selectedYear}
        GROUP BY o.name
        ORDER BY funding_usd DESC
        LIMIT 10
      `),

      db.execute(sql`
        SELECT
          COALESCE(s.name, 'Unspecified') as sector,
          SUM(fs.total_amount_usd::numeric) as funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        LEFT JOIN sectors s ON s.id = fs.sector_id
        WHERE c.iso3 = ${selectedCountry} AND fs.year = ${selectedYear}
        GROUP BY s.name
        ORDER BY funding_usd DESC
      `)
    ]);

    const countryInfo = (countriesData.rows as unknown as CountryFundingRow[]).find((c) => c.iso3 === selectedCountry);

    countryDetail = {
      iso3: selectedCountry,
      name: countryInfo?.name || selectedCountry,
      currentFunding: safeNumber(countryInfo?.funding_usd),
      peopleInNeed: safeNumber(countryInfo?.people_in_need),
      fundingHistory: (countryHistory.rows as unknown as CountryHistoryRow[]).map((r) => ({
        year: r.year,
        funding: safeNumber(r.funding_usd),
      })),
      topDonors: (countryDonors.rows as unknown as CountryDonorRow[]).map((r) => ({
        donor: r.donor,
        funding: safeNumber(r.funding_usd),
      })),
      sectors: (countrySectors.rows as unknown as CountrySectorRow[]).map((r) => ({
        sector: r.sector,
        funding: safeNumber(r.funding_usd),
      })),
    };
  }

  // Donor detail data if a donor is selected
  let donorDetail = null;
  if (selectedDonor) {
    // Get donor info
    const donorInfo = await db.execute(sql`
      SELECT id, name, org_type
      FROM organizations
      WHERE name = ${selectedDonor}
      LIMIT 1
    `);

    if (donorInfo.rows.length > 0) {
      const donor = donorInfo.rows[0] as unknown as DonorInfoRow;

      // Get funding history by year (up to 2025 - 2026 data is incomplete)
      const donorHistory = await db.execute(sql`
        SELECT
          fs.year,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          COUNT(DISTINCT fs.recipient_country_id) as countries_funded
        FROM flow_summaries fs
        WHERE fs.donor_org_id = ${donor.id} AND fs.year <= 2025
        GROUP BY fs.year
        ORDER BY fs.year ASC
      `);

      // Get flows to recipient countries for selected year
      const donorFlows = await db.execute(sql`
        SELECT
          c.name as country,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.donor_org_id = ${donor.id} AND fs.year = ${selectedYear}
        GROUP BY c.name, c.iso3
        ORDER BY funding_usd DESC
      `);

      // Get sector breakdown for this donor
      const donorSectors = await db.execute(sql`
        SELECT
          COALESCE(s.name, 'Unspecified') as sector,
          SUM(fs.total_amount_usd::numeric) as funding_usd
        FROM flow_summaries fs
        LEFT JOIN sectors s ON s.id = fs.sector_id
        WHERE fs.donor_org_id = ${donor.id} AND fs.year = ${selectedYear}
        GROUP BY s.name
        ORDER BY funding_usd DESC
      `);

      // Calculate total for this year
      const typedDonorFlows = donorFlows.rows as unknown as DonorFlowRow[];
      const totalThisYear = typedDonorFlows.reduce((sum, r) => sum + safeNumber(r.funding_usd), 0);

      donorDetail = {
        id: donor.id,
        name: donor.name,
        type: donor.org_type,
        currentFunding: totalThisYear,
        countriesFunded: typedDonorFlows.length,
        fundingHistory: (donorHistory.rows as unknown as DonorHistoryRow[]).map((r) => ({
          year: r.year,
          funding: safeNumber(r.funding_usd),
          countries: safeNumber(r.countries_funded),
        })),
        flows: typedDonorFlows.map((r) => ({
          country: r.country,
          iso3: r.iso3,
          funding: safeNumber(r.funding_usd),
          flowCount: safeNumber(r.flow_count),
        })),
        sectors: (donorSectors.rows as unknown as DonorSectorRow[]).map((r) => ({
          sector: r.sector,
          funding: safeNumber(r.funding_usd),
        })),
      };
    }
  }

  // Calculate summary stats
  const totalFunding = fundingByYear.find(f => f.year === selectedYear)?.totalUsd || '0';

  // Get list of countries with HRP for filter dropdown
  const countriesList = await db
    .select({ iso3: schema.countries.iso3, name: schema.countries.name })
    .from(schema.countries)
    .where(eq(schema.countries.hasHrp, true))
    .orderBy(schema.countries.name);

  return {
    selectedYear,
    selectedCountry,
    selectedDonor,
    donorFilter,
    availableYears: fundingByYear.map(f => f.year).sort((a, b) => b - a),
    countriesList: countriesList.map(c => ({ iso3: c.iso3, name: c.name })),

    // Chart data - merge funding with GHO people in need data
    fundingTrend: (fundingTrend.rows as unknown as FundingTrendRow[]).map((r) => {
      const nominalFunding = safeNumber(r.total_funding);
      const multiplier = getInflationMultiplier(r.year);
      return {
        year: r.year,
        funding: nominalFunding,
        fundingReal2025: nominalFunding * multiplier,  // Adjusted to 2025 USD
        inflationMultiplier: multiplier,
        countries: safeNumber(r.countries_funded),
        peopleInNeed: GHO_PEOPLE_IN_NEED[r.year] || null,  // From GHO reports
      };
    }),

    // Top 15 countries funding by year (for multi-line chart) - inflation adjusted to 2025 USD
    countryFundingByYear: (() => {
      const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const countries = new Map<string, { name: string; iso3: string; data: Map<number, number> }>();

      (countryFundingByYear.rows as unknown as CountryFundingByYearRow[]).forEach((r) => {
        if (!r.name) return; // Skip rows with null/undefined names
        if (!countries.has(r.name)) {
          countries.set(r.name, { name: r.name, iso3: r.iso3, data: new Map() });
        }
        // Apply inflation adjustment to convert to 2025 USD
        const nominalFunding = safeNumber(r.funding);
        const adjustedFunding = nominalFunding * getInflationMultiplier(r.year);
        const country = countries.get(r.name);
        if (country) {
          country.data.set(r.year, adjustedFunding);
        }
      });

      return {
        years,
        countries: Array.from(countries.values()).map(c => ({
          name: c.name,
          iso3: c.iso3,
          funding: years.map(y => c.data.get(y) || 0),
        })),
      };
    })(),

    countriesData: (countriesData.rows as unknown as CountryFundingRow[]).map((r) => {
      const funding = safeNumber(r.funding_usd);
      const prevFunding = safeNumber(r.prev_funding_usd) || null;
      // Use HAPI data first, then fallback to GHO country data
      const peopleInNeedRaw = r.people_in_need
        ? safeNumber(r.people_in_need)
        : (GHO_PIN_BY_COUNTRY[r.iso3] || null);
      // Ensure peopleInNeed is a valid positive finite number or null
      const peopleInNeed = (peopleInNeedRaw !== null && peopleInNeedRaw > 0 && Number.isFinite(peopleInNeedRaw))
        ? peopleInNeedRaw
        : null;
      // Use safe helpers for calculations
      const fundingPerPerson = safeDivide(funding, peopleInNeed || 0);
      const yoyChange = safeYoyChange(funding, prevFunding || 0);

      return {
        id: r.id,
        name: r.name,
        iso3: r.iso3,
        funding,
        flowCount: safeNumber(r.flow_count),
        prevFunding,
        yoyChange,
        peopleInNeed,
        fundingPerPerson,
      };
    }),

    sectorData: (sectorData.rows as unknown as SectorRow[]).map((r) => ({
      sector: r.sector,
      funding: safeNumber(r.funding_usd),
    })),

    donorData: (donorData.rows as unknown as DonorRow[]).map((r) => ({
      donor: r.donor,
      donorType: r.donor_type,
      funding: safeNumber(r.funding_usd),
      countriesFunded: safeNumber(r.countries_funded),
    })),

    // Consolidated donor data with US agencies combined
    consolidatedDonorData,

    donorTypeData: (donorTypeData.rows as unknown as DonorTypeRow[]).map((r) => ({
      type: r.donor_type,
      funding: safeNumber(r.funding_usd),
    })),

    topGovernmentDonors: topGovernmentDonors.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      category: d.category,
      yoyChange: safeYoyChange(d.funding, d.prevFunding),
    })),

    // Breakdowns for US and EU (for government donors chart)
    usAgenciesBreakdown: usAgencies.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      yoyChange: safeYoyChange(d.funding, d.prevFunding),
    })),
    euMemberStatesBreakdown: euMemberStates.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      yoyChange: safeYoyChange(d.funding, d.prevFunding),
    })),

    // All country agency breakdowns (for Top 15 Donors table)
    countryAgenciesBreakdown,

    // Country consolidation config for frontend display
    countryConsolidationConfig: COUNTRY_CONSOLIDATION_CONFIG,

    countryDetail,
    donorDetail,

    summary: {
      totalFunding: safeNumber(totalFunding),
      totalPeopleInNeed: GHO_PEOPLE_IN_NEED[selectedYear] || 0,  // Use GHO data for all years
      countriesWithFunding: countriesData.rows.length,
      countriesWithNeeds: (countriesData.rows as unknown as CountryFundingRow[]).filter((r) => r.people_in_need).length,
    },
  };
  } catch (err) {
    console.error('Failed to load funding data:', err);
    throw error(500, {
      message: 'Failed to load funding data. Please try again later.',
    });
  }
};
