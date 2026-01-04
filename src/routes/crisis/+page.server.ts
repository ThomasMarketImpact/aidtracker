import { db, schema } from '$lib/server/db';
import { sql, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { getLatestReports, getActiveDisasters } from '$lib/server/apis/reliefweb';
import { getCachedOrFetch } from '$lib/server/cache';

// Severity level descriptions
const SEVERITY_LEVELS = {
  1: { label: 'Minimal', color: '#22c55e', description: 'Stable conditions, minimal humanitarian needs' },
  2: { label: 'Stress', color: '#eab308', description: 'Elevated stress, some assistance needed' },
  3: { label: 'Crisis', color: '#f97316', description: 'Acute humanitarian crisis, urgent needs' },
  4: { label: 'Emergency', color: '#ef4444', description: 'Severe emergency, life-threatening conditions' },
  5: { label: 'Catastrophe', color: '#7f1d1d', description: 'Catastrophic/Famine conditions' }
};

export const load: PageServerLoad = async ({ url }) => {
  const yearParam = url.searchParams.get('year');
  let selectedYear = yearParam ? parseInt(yearParam, 10) : 2025;
  if (isNaN(selectedYear) || selectedYear < 2016 || selectedYear > 2030) {
    selectedYear = 2025;
  }

  // Get available years
  const yearsResult = await db
    .select({ year: schema.flowSummaries.year })
    .from(schema.flowSummaries)
    .groupBy(schema.flowSummaries.year)
    .orderBy(desc(schema.flowSummaries.year));

  const availableYears = yearsResult.map(r => r.year);

  // Fetch all crisis-related data in parallel
  const [
    jiafSummaryData,
    foodInsecurityData,
    refugeeData,
    fundingData,
    reliefWebReports,
    activeDisasters
  ] = await Promise.all([
    // JIAF Severity Summary
    db.execute(sql`
      SELECT
        js.country_id,
        c.name as country_name,
        c.iso3,
        js.total_population,
        js.total_pin,
        js.pin_severity_3_plus,
        js.pin_severity_4_plus,
        js.population_severity_1,
        js.population_severity_2,
        js.population_severity_3,
        js.population_severity_4,
        js.population_severity_5,
        js.admin_units_severity_3,
        js.admin_units_severity_4,
        js.admin_units_severity_5
      FROM jiaf_severity_summary js
      JOIN countries c ON c.id = js.country_id
      WHERE js.year = ${selectedYear}
      ORDER BY js.pin_severity_4_plus DESC NULLS LAST
    `),

    // IPC Food Insecurity (Phase 3+)
    db.execute(sql`
      SELECT
        fi.country_id,
        c.name as country_name,
        c.iso3,
        fi.phase1,
        fi.phase2,
        fi.phase3,
        fi.phase4,
        fi.phase5,
        fi.phase3_plus,
        fi.total_analyzed,
        fi.analysis_period
      FROM food_insecurity fi
      JOIN countries c ON c.id = fi.country_id
      WHERE fi.year = ${selectedYear}
      ORDER BY fi.phase3_plus DESC NULLS LAST
    `),

    // Refugee populations
    db.execute(sql`
      SELECT
        rp.country_id,
        c.name as country_name,
        c.iso3,
        rp.refugees,
        rp.asylum_seekers,
        rp.idps,
        rp.total_refugees_and_asylum
      FROM refugee_population rp
      JOIN countries c ON c.id = rp.country_id
      WHERE rp.year = ${selectedYear}
      ORDER BY rp.total_refugees_and_asylum DESC NULLS LAST
    `),

    // Funding vs needs
    db.execute(sql`
      SELECT
        c.name as country_name,
        c.iso3,
        SUM(fs.total_amount_usd::numeric) as funding,
        MAX(hn.people_in_need) as people_in_need
      FROM countries c
      LEFT JOIN flow_summaries fs ON fs.recipient_country_id = c.id AND fs.year = ${selectedYear}
      LEFT JOIN humanitarian_needs hn ON hn.country_id = c.id AND hn.year = ${selectedYear}
      WHERE c.has_hrp = true
      GROUP BY c.id, c.name, c.iso3
      HAVING SUM(fs.total_amount_usd::numeric) > 0 OR MAX(hn.people_in_need) > 0
      ORDER BY MAX(hn.people_in_need) DESC NULLS LAST
    `),

    // ReliefWeb latest reports (cached for 15 minutes)
    getCachedOrFetch('reliefweb_reports', () => getLatestReports(undefined, 10), 15 * 60 * 1000),

    // Active disasters (cached for 15 minutes)
    getCachedOrFetch('reliefweb_disasters', () => getActiveDisasters(undefined, 15), 15 * 60 * 1000)
  ]);

  // Process JIAF data - calculate dominant severity for each country
  const jiafCountries = (jiafSummaryData.rows as any[]).map(row => {
    const populations = [
      { level: 1, pop: Number(row.population_severity_1) || 0 },
      { level: 2, pop: Number(row.population_severity_2) || 0 },
      { level: 3, pop: Number(row.population_severity_3) || 0 },
      { level: 4, pop: Number(row.population_severity_4) || 0 },
      { level: 5, pop: Number(row.population_severity_5) || 0 }
    ];

    // Find the most severe level with significant population (>5% of PIN)
    const totalPin = Number(row.total_pin) || 0;
    let dominantSeverity = 1;
    for (let level = 5; level >= 1; level--) {
      const levelPop = populations.find(p => p.level === level)?.pop || 0;
      if (levelPop > totalPin * 0.05) {
        dominantSeverity = level;
        break;
      }
    }

    return {
      countryName: row.country_name,
      iso3: row.iso3,
      totalPopulation: Number(row.total_population) || 0,
      totalPin: totalPin,
      pinSeverity3Plus: Number(row.pin_severity_3_plus) || 0,
      pinSeverity4Plus: Number(row.pin_severity_4_plus) || 0,
      dominantSeverity,
      severityInfo: SEVERITY_LEVELS[dominantSeverity as keyof typeof SEVERITY_LEVELS],
      severityBreakdown: populations
    };
  });

  // Process IPC data
  const ipcCountries = (foodInsecurityData.rows as any[]).map(row => ({
    countryName: row.country_name,
    iso3: row.iso3,
    phase1: Number(row.phase1) || 0,
    phase2: Number(row.phase2) || 0,
    phase3: Number(row.phase3) || 0,
    phase4: Number(row.phase4) || 0,
    phase5: Number(row.phase5) || 0,
    phase3Plus: Number(row.phase3_plus) || 0,
    totalAnalyzed: Number(row.total_analyzed) || 0,
    analysisPeriod: row.analysis_period
  }));

  // Process refugee data
  const refugeeCountries = (refugeeData.rows as any[])
    .filter(row => (Number(row.total_refugees_and_asylum) || 0) > 0)
    .map(row => ({
      countryName: row.country_name,
      iso3: row.iso3,
      refugees: Number(row.refugees) || 0,
      asylumSeekers: Number(row.asylum_seekers) || 0,
      idps: Number(row.idps) || 0,
      total: Number(row.total_refugees_and_asylum) || 0
    }));

  // Process funding gaps
  const fundingGaps = (fundingData.rows as any[])
    .filter(row => (Number(row.people_in_need) || 0) > 0)
    .map(row => {
      const funding = Number(row.funding) || 0;
      const pin = Number(row.people_in_need) || 0;
      const target = pin * 200; // $200 per person target
      const gap = Math.max(0, target - funding);
      const coveragePercent = target > 0 ? (funding / target) * 100 : 0;

      return {
        countryName: row.country_name,
        iso3: row.iso3,
        funding,
        peopleInNeed: pin,
        targetFunding: target,
        fundingGap: gap,
        coveragePercent,
        fundingPerPerson: pin > 0 ? funding / pin : 0
      };
    })
    .sort((a, b) => b.fundingGap - a.fundingGap);

  // Calculate summary statistics
  const summary = {
    totalPeopleInNeed: jiafCountries.reduce((sum, c) => sum + c.totalPin, 0),
    totalFoodInsecure: ipcCountries.reduce((sum, c) => sum + c.phase3Plus, 0),
    totalRefugees: refugeeCountries.reduce((sum, c) => sum + c.total, 0),
    totalFundingGap: fundingGaps.reduce((sum, c) => sum + c.fundingGap, 0),
    countriesWithSeverity4Plus: jiafCountries.filter(c => c.pinSeverity4Plus > 100000).length,
    countriesWithFamine: ipcCountries.filter(c => c.phase5 > 0).length
  };

  // Get severity distribution for chart
  const severityDistribution = [1, 2, 3, 4, 5].map(level => ({
    level,
    ...SEVERITY_LEVELS[level as keyof typeof SEVERITY_LEVELS],
    population: jiafCountries.reduce((sum, c) => {
      const levelPop = c.severityBreakdown.find(s => s.level === level)?.pop || 0;
      return sum + levelPop;
    }, 0),
    countryCount: jiafCountries.filter(c => c.dominantSeverity === level).length
  }));

  return {
    selectedYear,
    availableYears,
    summary,
    severityLevels: SEVERITY_LEVELS,
    severityDistribution,
    jiafCountries: jiafCountries.slice(0, 20),
    ipcCountries: ipcCountries.slice(0, 20),
    refugeeCountries: refugeeCountries.slice(0, 15),
    fundingGaps: fundingGaps.slice(0, 15),
    reliefWebReports: reliefWebReports || [],
    activeDisasters: activeDisasters || []
  };
};
