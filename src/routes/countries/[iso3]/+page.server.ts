import { db, schema } from '$lib/server/db';
import { sql, eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { safeNumber, safeYoyChange, safeDivide } from '$lib/utils/numbers';

export const load: PageServerLoad = async ({ params, url }) => {
  const { iso3 } = params;

  // Validate ISO3 code
  if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) {
    throw error(400, 'Invalid country code');
  }

  const yearParam = url.searchParams.get('year');
  let selectedYear = yearParam ? parseInt(yearParam, 10) : 2025;
  if (isNaN(selectedYear) || selectedYear < 2016 || selectedYear > 2030) {
    selectedYear = 2025;
  }

  try {
    // Get country info
    const countryInfo = await db
      .select()
      .from(schema.countries)
      .where(eq(schema.countries.iso3, iso3))
      .limit(1);

    if (countryInfo.length === 0) {
      throw error(404, 'Country not found');
    }

    const country = countryInfo[0];
    const countryId = country.id;

    // Get available years
    const yearsResult = await db
      .select({ year: schema.flowSummaries.year })
      .from(schema.flowSummaries)
      .where(eq(schema.flowSummaries.recipientCountryId, countryId))
      .groupBy(schema.flowSummaries.year)
      .orderBy(desc(schema.flowSummaries.year));

    const availableYears = yearsResult.map(r => r.year);

    // Run all queries in parallel for better performance
    const [
      fundingHistory,
      currentYearFunding,
      prevYearFunding,
      topDonors,
      prevYearDonors,
      sectorFunding,
      humanitarianNeeds,
      foodInsecurity,
      refugeeData,
      jiafSummary,
      fundingReqs,
      childWelfare,
      plansData
    ] = await Promise.all([
      // Funding history by year
      db.execute(sql`
        SELECT
          year,
          SUM(total_amount_usd::numeric) as funding
        FROM flow_summaries
        WHERE recipient_country_id = ${countryId}
        GROUP BY year
        ORDER BY year ASC
      `),

      // Current year total funding
      db.execute(sql`
        SELECT
          SUM(total_amount_usd::numeric) as total_funding,
          SUM(flow_count) as total_flows,
          COUNT(DISTINCT donor_org_id) as donor_count,
          COUNT(DISTINCT sector_id) as sector_count
        FROM flow_summaries
        WHERE recipient_country_id = ${countryId} AND year = ${selectedYear}
      `),

      // Previous year funding for YoY
      db.execute(sql`
        SELECT SUM(total_amount_usd::numeric) as total_funding
        FROM flow_summaries
        WHERE recipient_country_id = ${countryId} AND year = ${selectedYear - 1}
      `),

      // Top donors for current year
      db.execute(sql`
        SELECT
          COALESCE(o.name, 'Unknown') as donor,
          o.org_type as donor_type,
          SUM(fs.total_amount_usd::numeric) as funding,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        LEFT JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.recipient_country_id = ${countryId} AND fs.year = ${selectedYear}
        GROUP BY o.name, o.org_type
        ORDER BY funding DESC
        LIMIT 15
      `),

      // Previous year donors for YoY comparison
      db.execute(sql`
        SELECT
          COALESCE(o.name, 'Unknown') as donor,
          SUM(fs.total_amount_usd::numeric) as funding
        FROM flow_summaries fs
        LEFT JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.recipient_country_id = ${countryId} AND fs.year = ${selectedYear - 1}
        GROUP BY o.name
      `),

      // Sector funding breakdown
      db.execute(sql`
        SELECT
          COALESCE(s.name, 'Unspecified') as sector,
          COALESCE(s.code, 'UNS') as sector_code,
          SUM(fs.total_amount_usd::numeric) as funding
        FROM flow_summaries fs
        LEFT JOIN sectors s ON s.id = fs.sector_id
        WHERE fs.recipient_country_id = ${countryId} AND fs.year = ${selectedYear}
        GROUP BY s.name, s.code
        ORDER BY funding DESC
      `),

      // Humanitarian needs by sector
      db.execute(sql`
        SELECT
          COALESCE(s.name, 'Intersectoral') as sector,
          COALESCE(s.code, 'Intersectoral') as sector_code,
          hn.people_in_need,
          hn.people_targeted,
          hn.people_reached
        FROM humanitarian_needs hn
        LEFT JOIN sectors s ON s.id = hn.sector_id
        WHERE hn.country_id = ${countryId} AND hn.year = ${selectedYear}
        ORDER BY hn.people_in_need DESC NULLS LAST
      `),

      // Food insecurity (IPC phases)
      db.execute(sql`
        SELECT
          year,
          phase1,
          phase2,
          phase3,
          phase4,
          phase5,
          phase3_plus,
          total_analyzed,
          analysis_period
        FROM food_insecurity
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 3
      `),

      // Refugee population data
      db.execute(sql`
        SELECT
          year,
          refugees,
          asylum_seekers,
          idps,
          stateless,
          returned_refugees,
          returned_idps,
          other_of_concern,
          total_refugees_and_asylum
        FROM refugee_population
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 3
      `),

      // JIAF severity summary
      db.execute(sql`
        SELECT
          year,
          population_severity_1,
          population_severity_2,
          population_severity_3,
          population_severity_4,
          population_severity_5,
          total_population,
          total_pin,
          pin_severity_3_plus,
          pin_severity_4_plus
        FROM jiaf_severity_summary
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 3
      `),

      // Funding requirements
      db.execute(sql`
        SELECT
          year,
          requirements,
          funding,
          percent_funded
        FROM funding_requirements
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 5
      `),

      // Child welfare indicators
      db.execute(sql`
        SELECT *
        FROM child_welfare_indicators
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 1
      `),

      // Humanitarian Response Plans
      db.execute(sql`
        SELECT
          name,
          short_name,
          year,
          plan_type,
          orig_requirements,
          revised_requirements,
          is_released
        FROM plans
        WHERE country_id = ${countryId}
        ORDER BY year DESC
        LIMIT 5
      `)
    ]);

    // Build previous year donor map for YoY
    const prevDonorMap = new Map<string, number>();
    for (const row of prevYearDonors.rows as any[]) {
      prevDonorMap.set(row.donor, Number(row.funding) || 0);
    }

    // Process current year summary
    const currentSummary = currentYearFunding.rows[0] as any;
    const prevSummary = prevYearFunding.rows[0] as any;
    const currentFunding = safeNumber(currentSummary?.total_funding);
    const prevFunding = safeNumber(prevSummary?.total_funding);

    // Get intersectoral PIN (total people in need)
    const intersectoralNeeds = (humanitarianNeeds.rows as any[]).find(
      r => r.sector_code === 'Intersectoral' || r.sector === 'Intersectoral'
    );
    const totalPeopleInNeed = safeNumber(intersectoralNeeds?.people_in_need);

    // Current year IPC data
    const currentIpc = (foodInsecurity.rows as any[]).find(r => r.year === selectedYear)
      || foodInsecurity.rows[0] as any;

    // Current year refugee data
    const currentRefugee = (refugeeData.rows as any[]).find(r => r.year === selectedYear)
      || refugeeData.rows[0] as any;

    // Current year JIAF data
    const currentJiaf = (jiafSummary.rows as any[]).find(r => r.year === selectedYear)
      || jiafSummary.rows[0] as any;

    // Current year funding requirements
    const currentReqs = (fundingReqs.rows as any[]).find(r => r.year === selectedYear)
      || fundingReqs.rows[0] as any;

    // Build sector data with needs combined
    const sectorNeedsMap = new Map<string, any>();
    for (const row of humanitarianNeeds.rows as any[]) {
      sectorNeedsMap.set(row.sector_code, row);
    }

    const sectors = (sectorFunding.rows as any[]).map(s => {
      const needs = sectorNeedsMap.get(s.sector_code);
      const funding = safeNumber(s.funding);
      const pin = safeNumber(needs?.people_in_need);
      return {
        sector: s.sector,
        code: s.sector_code,
        funding,
        peopleInNeed: pin || null,
        peopleTargeted: safeNumber(needs?.people_targeted) || null,
        peopleReached: safeNumber(needs?.people_reached) || null,
        fundingPerPerson: pin > 0 ? safeDivide(funding, pin) : null
      };
    });

    // Process donors with YoY
    const donors = (topDonors.rows as any[]).map(d => {
      const funding = safeNumber(d.funding);
      const prevDonorFunding = prevDonorMap.get(d.donor) || null;
      return {
        donor: d.donor,
        type: d.donor_type || 'Unknown',
        funding,
        flowCount: safeNumber(d.flow_count),
        prevFunding: prevDonorFunding,
        yoyChange: prevDonorFunding ? safeYoyChange(funding, prevDonorFunding) : null
      };
    });

    return {
      country: {
        id: country.id,
        iso3: country.iso3,
        name: country.name,
        region: country.region,
        hasHrp: country.hasHrp,
        inGho: country.inGho
      },
      selectedYear,
      availableYears,

      // Summary metrics
      summary: {
        totalFunding: currentFunding,
        prevYearFunding: prevFunding,
        yoyChange: safeYoyChange(currentFunding, prevFunding),
        donorCount: safeNumber(currentSummary?.donor_count),
        sectorCount: safeNumber(currentSummary?.sector_count),
        flowCount: safeNumber(currentSummary?.total_flows),
        peopleInNeed: totalPeopleInNeed || null,
        fundingPerPerson: totalPeopleInNeed > 0
          ? safeDivide(currentFunding, totalPeopleInNeed)
          : null
      },

      // Funding history for trend chart
      fundingHistory: (fundingHistory.rows as any[]).map(r => ({
        year: r.year,
        funding: safeNumber(r.funding)
      })),

      // Top donors
      donors,

      // Sector breakdown with needs
      sectors,

      // Food insecurity (IPC phases)
      foodInsecurity: currentIpc ? {
        year: currentIpc.year,
        analysisPeriod: currentIpc.analysis_period,
        phases: {
          phase1: safeNumber(currentIpc.phase1),
          phase2: safeNumber(currentIpc.phase2),
          phase3: safeNumber(currentIpc.phase3),
          phase4: safeNumber(currentIpc.phase4),
          phase5: safeNumber(currentIpc.phase5),
          phase3Plus: safeNumber(currentIpc.phase3_plus)
        },
        totalAnalyzed: safeNumber(currentIpc.total_analyzed)
      } : null,

      // IPC history for trends
      foodInsecurityHistory: (foodInsecurity.rows as any[]).map(r => ({
        year: r.year,
        phase3Plus: safeNumber(r.phase3_plus),
        totalAnalyzed: safeNumber(r.total_analyzed)
      })),

      // Refugee population
      refugeePopulation: currentRefugee ? {
        year: currentRefugee.year,
        refugees: safeNumber(currentRefugee.refugees),
        asylumSeekers: safeNumber(currentRefugee.asylum_seekers),
        idps: safeNumber(currentRefugee.idps),
        stateless: safeNumber(currentRefugee.stateless),
        returnedRefugees: safeNumber(currentRefugee.returned_refugees),
        returnedIdps: safeNumber(currentRefugee.returned_idps),
        otherOfConcern: safeNumber(currentRefugee.other_of_concern),
        total: safeNumber(currentRefugee.total_refugees_and_asylum)
      } : null,

      // Refugee history
      refugeeHistory: (refugeeData.rows as any[]).map(r => ({
        year: r.year,
        refugees: safeNumber(r.refugees),
        asylumSeekers: safeNumber(r.asylum_seekers),
        idps: safeNumber(r.idps),
        total: safeNumber(r.total_refugees_and_asylum)
      })),

      // JIAF severity
      jiafSeverity: currentJiaf ? {
        year: currentJiaf.year,
        severity1: safeNumber(currentJiaf.population_severity_1),
        severity2: safeNumber(currentJiaf.population_severity_2),
        severity3: safeNumber(currentJiaf.population_severity_3),
        severity4: safeNumber(currentJiaf.population_severity_4),
        severity5: safeNumber(currentJiaf.population_severity_5),
        totalPopulation: safeNumber(currentJiaf.total_population),
        totalPin: safeNumber(currentJiaf.total_pin),
        severity3Plus: safeNumber(currentJiaf.pin_severity_3_plus),
        severity4Plus: safeNumber(currentJiaf.pin_severity_4_plus)
      } : null,

      // Funding requirements & gap
      fundingRequirements: currentReqs ? {
        year: currentReqs.year,
        requirements: safeNumber(currentReqs.requirements),
        funding: safeNumber(currentReqs.funding),
        percentFunded: safeNumber(currentReqs.percent_funded),
        gap: safeNumber(currentReqs.requirements) - safeNumber(currentReqs.funding)
      } : null,

      // Funding requirements history
      fundingReqsHistory: (fundingReqs.rows as any[]).map(r => ({
        year: r.year,
        requirements: safeNumber(r.requirements),
        funding: safeNumber(r.funding),
        percentFunded: safeNumber(r.percent_funded)
      })),

      // Child welfare indicators
      childWelfare: childWelfare.rows[0] ? {
        year: (childWelfare.rows[0] as any).year,
        under5Mortality: safeNumber((childWelfare.rows[0] as any).under5_mortality_rate),
        infantMortality: safeNumber((childWelfare.rows[0] as any).infant_mortality_rate),
        stuntingPrevalence: safeNumber((childWelfare.rows[0] as any).stunting_prevalence),
        wastingPrevalence: safeNumber((childWelfare.rows[0] as any).wasting_prevalence),
        dtp3Coverage: safeNumber((childWelfare.rows[0] as any).dtp3_coverage),
        measlesCoverage: safeNumber((childWelfare.rows[0] as any).measles_coverage),
        populationUnder5: safeNumber((childWelfare.rows[0] as any).population_under5),
        populationUnder18: safeNumber((childWelfare.rows[0] as any).population_under18)
      } : null,

      // Humanitarian Response Plans
      plans: (plansData.rows as any[]).map(p => ({
        name: p.name,
        shortName: p.short_name,
        year: p.year,
        planType: p.plan_type,
        requirements: safeNumber(p.revised_requirements) || safeNumber(p.orig_requirements),
        isReleased: p.is_released
      }))
    };
  } catch (err) {
    if ((err as any)?.status) throw err;
    console.error('Failed to load country data:', err);
    throw error(500, 'Failed to load country data');
  }
};
