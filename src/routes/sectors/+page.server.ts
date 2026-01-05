import { db, schema } from '$lib/server/db';
import { sql, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const yearParam = url.searchParams.get('year');
  let selectedYear = yearParam ? parseInt(yearParam, 10) : 2025;
  if (isNaN(selectedYear) || selectedYear < 2016 || selectedYear > 2030) {
    selectedYear = 2025;
  }

  try {
    // Get available years
    const yearsResult = await db
    .select({ year: schema.flowSummaries.year })
    .from(schema.flowSummaries)
    .groupBy(schema.flowSummaries.year)
    .orderBy(desc(schema.flowSummaries.year));

  const availableYears = yearsResult.map(r => r.year);

  // Get sector funding for selected year with previous year for YoY
  const [sectorsData, prevYearSectors] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(s.code, 'Unspecified') as code,
        COALESCE(s.name, 'Unspecified') as name,
        s.is_global_cluster,
        SUM(fs.total_amount_usd::numeric) as total_funding,
        SUM(fs.flow_count) as flow_count,
        COUNT(DISTINCT fs.recipient_country_id) as country_count,
        COUNT(DISTINCT fs.donor_org_id) as donor_count
      FROM flow_summaries fs
      LEFT JOIN sectors s ON s.id = fs.sector_id
      WHERE fs.year = ${selectedYear}
      GROUP BY s.code, s.name, s.is_global_cluster
      ORDER BY total_funding DESC
    `),
    db.execute(sql`
      SELECT
        COALESCE(s.code, 'Unspecified') as code,
        SUM(fs.total_amount_usd::numeric) as total_funding
      FROM flow_summaries fs
      LEFT JOIN sectors s ON s.id = fs.sector_id
      WHERE fs.year = ${selectedYear - 1}
      GROUP BY s.code
    `)
  ]);

  // Build previous year map for YoY calculation
  const prevYearMap = new Map<string, number>();
  for (const row of prevYearSectors.rows as any[]) {
    prevYearMap.set(row.code, Number(row.total_funding) || 0);
  }

  // Get sector funding by year for trend analysis
  const sectorTrends = await db.execute(sql`
    SELECT
      COALESCE(s.code, 'Unspecified') as code,
      fs.year,
      SUM(fs.total_amount_usd::numeric) as total_funding
    FROM flow_summaries fs
    LEFT JOIN sectors s ON s.id = fs.sector_id
    WHERE fs.year >= 2018
    GROUP BY s.code, fs.year
    ORDER BY fs.year, total_funding DESC
  `);

  // Get top countries per sector (for selected year)
  const sectorCountries = await db.execute(sql`
    SELECT
      COALESCE(s.code, 'Unspecified') as sector_code,
      c.name as country_name,
      c.iso3,
      SUM(fs.total_amount_usd::numeric) as funding
    FROM flow_summaries fs
    LEFT JOIN sectors s ON s.id = fs.sector_id
    JOIN countries c ON c.id = fs.recipient_country_id
    WHERE fs.year = ${selectedYear}
    GROUP BY s.code, c.name, c.iso3
    ORDER BY s.code, funding DESC
  `);

  // Group countries by sector (top 5 per sector)
  const countriesBySector = new Map<string, Array<{ name: string; iso3: string; funding: number }>>();
  for (const row of sectorCountries.rows as any[]) {
    const sectorCode = row.sector_code;
    if (!countriesBySector.has(sectorCode)) {
      countriesBySector.set(sectorCode, []);
    }
    const countries = countriesBySector.get(sectorCode)!;
    if (countries.length < 5) {
      countries.push({
        name: row.country_name,
        iso3: row.iso3,
        funding: Number(row.funding) || 0
      });
    }
  }

  // Get humanitarian needs by sector
  const sectorNeeds = await db.execute(sql`
    SELECT
      COALESCE(s.code, 'Unspecified') as code,
      COALESCE(s.name, 'Unspecified') as name,
      SUM(hn.people_in_need) as total_pin,
      SUM(hn.people_targeted) as total_targeted,
      SUM(hn.people_reached) as total_reached,
      COUNT(DISTINCT hn.country_id) as country_count
    FROM humanitarian_needs hn
    JOIN sectors s ON s.id = hn.sector_id
    WHERE hn.year = ${selectedYear}
    GROUP BY s.code, s.name
    ORDER BY total_pin DESC
  `);

  // Build needs map
  const needsMap = new Map<string, { pin: number; targeted: number; reached: number; countryCount: number }>();
  for (const row of sectorNeeds.rows as any[]) {
    needsMap.set(row.code, {
      pin: Number(row.total_pin) || 0,
      targeted: Number(row.total_targeted) || 0,
      reached: Number(row.total_reached) || 0,
      countryCount: Number(row.country_count) || 0
    });
  }

  // Process sectors data
  const sectors = (sectorsData.rows as any[])
    .filter(s => s.name)
    .map(s => {
      const funding = Number(s.total_funding) || 0;
      const prevFunding = prevYearMap.get(s.code) || 0;
      const needs = needsMap.get(s.code);
      const yoyChange = prevFunding > 0 ? ((funding - prevFunding) / prevFunding) * 100 : null;

      return {
        code: s.code,
        name: s.name,
        isGlobalCluster: s.is_global_cluster || false,
        funding,
        prevFunding,
        yoyChange,
        flowCount: Number(s.flow_count) || 0,
        countryCount: Number(s.country_count) || 0,
        donorCount: Number(s.donor_count) || 0,
        peopleInNeed: needs?.pin || null,
        peopleTargeted: needs?.targeted || null,
        peopleReached: needs?.reached || null,
        fundingPerPerson: needs?.pin && needs.pin > 0 ? funding / needs.pin : null,
        topCountries: countriesBySector.get(s.code) || []
      };
    });

  // Build trend data for chart
  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].filter(y => y <= selectedYear);
  const trendMap = new Map<string, Map<number, number>>();

  for (const row of sectorTrends.rows as any[]) {
    if (!trendMap.has(row.code)) {
      trendMap.set(row.code, new Map());
    }
    trendMap.get(row.code)!.set(row.year, Number(row.total_funding) || 0);
  }

  // Get top 8 sectors by current funding for trend chart
  const topSectorCodes = sectors.slice(0, 8).map(s => s.code);
  const sectorTrendsData = topSectorCodes.map(code => {
    const sector = sectors.find(s => s.code === code);
    const yearData = trendMap.get(code) || new Map();
    return {
      code,
      name: sector?.name || code,
      data: years.map(y => yearData.get(y) || 0)
    };
  });

  const totalFunding = sectors.reduce((sum, s) => sum + s.funding, 0);
  const globalClusters = sectors.filter(s => s.isGlobalCluster);

  return {
    selectedYear,
    availableYears,
    sectors,
    globalClusters,
    totalFunding,
    totalSectors: sectors.length,
    trends: {
      years,
      sectors: sectorTrendsData
    }
  };
  } catch (error) {
    console.error('Failed to load sectors data:', error);
    return {
      selectedYear,
      availableYears: [],
      sectors: [],
      globalClusters: [],
      totalFunding: 0,
      totalSectors: 0,
      trends: {
        years: [],
        sectors: []
      }
    };
  }
};
