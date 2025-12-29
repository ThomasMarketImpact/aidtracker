import { db, schema } from '$lib/server/db';
import { sql, desc, eq, sum, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

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
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden',
  'European Commission', 'European Union', 'ECHO', 'EU '
];

// Donor filter types
export type DonorFilter = 'all' | 'oecd' | 'eu_echo' | 'us';

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
  // Parse and validate year parameter
  const yearParam = url.searchParams.get('year');
  let selectedYear = yearParam ? parseInt(yearParam, 10) : 2025;
  // Validate year is a reasonable number (2016-2030 range)
  if (isNaN(selectedYear) || selectedYear < 2016 || selectedYear > 2030) {
    selectedYear = 2025;
  }

  // Validate country parameter (ISO3 code should be exactly 3 uppercase letters)
  const countryParam = url.searchParams.get('country');
  const selectedCountry = countryParam && /^[A-Z]{3}$/.test(countryParam) ? countryParam : null;

  // Validate donor parameter (limit length, trim whitespace)
  const donorParam = url.searchParams.get('donor');
  const selectedDonor = donorParam && donorParam.trim().length > 0 && donorParam.length <= 500
    ? donorParam.trim()
    : null;

  const donorFilter = (url.searchParams.get('donorFilter') || 'all') as DonorFilter;

  // Run independent queries in parallel for better performance
  const [fundingByYear, fundingTrend, countryFundingByYear] = await Promise.all([
    // Get all years with funding data
    db.select({
      year: schema.flowSummaries.year,
      totalUsd: sum(schema.flowSummaries.totalAmountUsd),
      flowCount: sum(schema.flowSummaries.flowCount),
    })
    .from(schema.flowSummaries)
    .groupBy(schema.flowSummaries.year)
    .orderBy(desc(schema.flowSummaries.year)),

    // Get funding trend data (all years, for line chart)
    db.execute(sql`
      SELECT
        fs.year,
        SUM(fs.total_amount_usd::numeric) as total_funding,
        COUNT(DISTINCT fs.recipient_country_id) as countries_funded
      FROM flow_summaries fs
      GROUP BY fs.year
      ORDER BY fs.year ASC
    `),

    // Get funding by year for top 15 recipient countries (for multi-line chart)
    db.execute(sql`
      WITH top_countries AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as total_funding
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year >= 2016
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
      WHERE fs.year >= 2016
      GROUP BY tc.name, tc.iso3, fs.year
      ORDER BY tc.name, fs.year
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
  const buildDonorFilterCondition = (filter: DonorFilter): string => {
    switch (filter) {
      case 'us':
        return `(o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%')`;
      case 'oecd':
        return `(${OECD_DAC_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
      case 'eu_echo':
        return `(${EU_ECHO_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
      default:
        return '1=1';
    }
  };

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
    'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
    'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
    'Poland', 'Portugal', 'Romania', 'Slovak', 'Slovenia', 'Spain', 'Sweden'
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
  const [sectorData, donorData, donorTypeData, topGovernmentDonorsRaw, prevYearGovernmentDonors] = await Promise.all([
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
    // Build previous year lookup
    const prevYearMap = new Map<string, number>();
    prevYearGovernmentDonors.rows.forEach((r: any) => {
      prevYearMap.set(r.donor, Number(r.funding_usd));
    });

    // Aggregate totals
    let usTotal = 0, usPrevTotal = 0;
    let euMemberTotal = 0, euMemberPrevTotal = 0;
    let euInstitutionTotal = 0, euInstitutionPrevTotal = 0;
    const others: { donor: string; funding: number; prevFunding: number }[] = [];

    // Track individual breakdowns for US and EU
    const usAgencies: { donor: string; funding: number; prevFunding: number }[] = [];
    const euMemberStates: { donor: string; funding: number; prevFunding: number }[] = [];

    topGovernmentDonorsRaw.rows.forEach((r: any) => {
      const donor = r.donor as string;
      const funding = Number(r.funding_usd);
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
        WHERE c.iso3 = ${selectedCountry}
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

    const countryInfo = countriesData.rows.find((c: any) => c.iso3 === selectedCountry);

    countryDetail = {
      iso3: selectedCountry,
      name: countryInfo?.name || selectedCountry,
      currentFunding: Number(countryInfo?.funding_usd || 0),
      peopleInNeed: Number(countryInfo?.people_in_need || 0),
      fundingHistory: countryHistory.rows.map((r: any) => ({
        year: r.year,
        funding: Number(r.funding_usd),
      })),
      topDonors: countryDonors.rows.map((r: any) => ({
        donor: r.donor,
        funding: Number(r.funding_usd),
      })),
      sectors: countrySectors.rows.map((r: any) => ({
        sector: r.sector,
        funding: Number(r.funding_usd),
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
      const donor = donorInfo.rows[0] as any;

      // Get funding history by year
      const donorHistory = await db.execute(sql`
        SELECT
          fs.year,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          COUNT(DISTINCT fs.recipient_country_id) as countries_funded
        FROM flow_summaries fs
        WHERE fs.donor_org_id = ${donor.id}
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
      const totalThisYear = donorFlows.rows.reduce((sum: number, r: any) => sum + Number(r.funding_usd), 0);

      donorDetail = {
        id: donor.id,
        name: donor.name,
        type: donor.org_type,
        currentFunding: totalThisYear,
        countriesFunded: donorFlows.rows.length,
        fundingHistory: donorHistory.rows.map((r: any) => ({
          year: r.year,
          funding: Number(r.funding_usd),
          countries: Number(r.countries_funded),
        })),
        flows: donorFlows.rows.map((r: any) => ({
          country: r.country,
          iso3: r.iso3,
          funding: Number(r.funding_usd),
          flowCount: Number(r.flow_count),
        })),
        sectors: donorSectors.rows.map((r: any) => ({
          sector: r.sector,
          funding: Number(r.funding_usd),
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
    fundingTrend: fundingTrend.rows.map((r: any) => {
      const nominalFunding = Number(r.total_funding);
      const multiplier = getInflationMultiplier(r.year);
      return {
        year: r.year,
        funding: nominalFunding,
        fundingReal2025: nominalFunding * multiplier,  // Adjusted to 2025 USD
        inflationMultiplier: multiplier,
        countries: Number(r.countries_funded),
        peopleInNeed: GHO_PEOPLE_IN_NEED[r.year] || null,  // From GHO reports
      };
    }),

    // Top 15 countries funding by year (for multi-line chart) - inflation adjusted to 2025 USD
    countryFundingByYear: (() => {
      const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      const countries = new Map<string, { name: string; iso3: string; data: Map<number, number> }>();

      countryFundingByYear.rows.forEach((r: any) => {
        if (!countries.has(r.name)) {
          countries.set(r.name, { name: r.name, iso3: r.iso3, data: new Map() });
        }
        // Apply inflation adjustment to convert to 2025 USD
        const nominalFunding = Number(r.funding);
        const adjustedFunding = nominalFunding * getInflationMultiplier(r.year);
        countries.get(r.name)!.data.set(r.year, adjustedFunding);
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

    countriesData: countriesData.rows.map((r: any) => {
      const funding = Number(r.funding_usd);
      const prevFunding = r.prev_funding_usd ? Number(r.prev_funding_usd) : null;
      // Use HAPI data first, then fallback to GHO country data
      const peopleInNeed = r.people_in_need
        ? Number(r.people_in_need)
        : (GHO_PIN_BY_COUNTRY[r.iso3] || null);
      const fundingPerPerson = peopleInNeed ? funding / peopleInNeed : null;
      const yoyChange = prevFunding && prevFunding > 0
        ? ((funding - prevFunding) / prevFunding) * 100
        : null;

      return {
        id: r.id,
        name: r.name,
        iso3: r.iso3,
        funding,
        flowCount: Number(r.flow_count),
        prevFunding,
        yoyChange,
        peopleInNeed,
        fundingPerPerson,
      };
    }),

    sectorData: sectorData.rows.map((r: any) => ({
      sector: r.sector,
      funding: Number(r.funding_usd),
    })),

    donorData: donorData.rows.map((r: any) => ({
      donor: r.donor,
      donorType: r.donor_type,
      funding: Number(r.funding_usd),
      countriesFunded: Number(r.countries_funded),
    })),

    donorTypeData: donorTypeData.rows.map((r: any) => ({
      type: r.donor_type,
      funding: Number(r.funding_usd),
    })),

    topGovernmentDonors: topGovernmentDonors.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      category: d.category,
      yoyChange: d.prevFunding > 0 ? ((d.funding - d.prevFunding) / d.prevFunding) * 100 : null,
    })),

    // Breakdowns for US and EU
    usAgenciesBreakdown: usAgencies.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      yoyChange: d.prevFunding > 0 ? ((d.funding - d.prevFunding) / d.prevFunding) * 100 : null,
    })),
    euMemberStatesBreakdown: euMemberStates.map(d => ({
      donor: d.donor,
      funding: d.funding,
      prevFunding: d.prevFunding,
      yoyChange: d.prevFunding > 0 ? ((d.funding - d.prevFunding) / d.prevFunding) * 100 : null,
    })),

    countryDetail,
    donorDetail,

    summary: {
      totalFunding: Number(totalFunding),
      totalPeopleInNeed: GHO_PEOPLE_IN_NEED[selectedYear] || 0,  // Use GHO data for all years
      countriesWithFunding: countriesData.rows.length,
      countriesWithNeeds: countriesData.rows.filter((r: any) => r.people_in_need).length,
    },
  };
};
