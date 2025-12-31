import { db, schema } from '$lib/server/db';
import { sql, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

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

  // Get all countries with funding data for selected year
  const countriesData = await db
    .select({
      iso3: schema.countries.iso3,
      name: schema.countries.name,
      countryId: schema.countries.id,
      totalFunding: sql<number>`sum(${schema.flowSummaries.totalAmountUsd})`.as('total_funding'),
      flowCount: sql<number>`sum(${schema.flowSummaries.flowCount})`.as('flow_count'),
      donorCount: sql<number>`count(distinct ${schema.flowSummaries.donorOrgId})`.as('donor_count'),
    })
    .from(schema.flowSummaries)
    .innerJoin(schema.countries, eq(schema.flowSummaries.recipientCountryId, schema.countries.id))
    .where(sql`${schema.flowSummaries.year} = ${selectedYear}`)
    .groupBy(schema.countries.iso3, schema.countries.name, schema.countries.id)
    .orderBy(desc(sql`total_funding`));

  // Get people in need data from HAPI (humanitarian needs assessments)
  const pinData = await db
    .select({
      countryId: schema.humanitarianNeeds.countryId,
      peopleInNeed: schema.humanitarianNeeds.peopleInNeed,
    })
    .from(schema.humanitarianNeeds)
    .where(sql`${schema.humanitarianNeeds.year} = ${selectedYear}`);

  // Get refugee data from UNHCR (refugees hosted in each country)
  const refugeeData = await db
    .select({
      countryId: schema.refugeePopulation.countryId,
      refugees: schema.refugeePopulation.refugees,
      asylumSeekers: schema.refugeePopulation.asylumSeekers,
      totalRefugeesAndAsylum: schema.refugeePopulation.totalRefugeesAndAsylum,
    })
    .from(schema.refugeePopulation)
    .where(sql`${schema.refugeePopulation.year} = ${selectedYear}`);

  // Get country ID to ISO3 mapping
  const countryIdToIso3 = await db
    .select({
      id: schema.countries.id,
      iso3: schema.countries.iso3,
    })
    .from(schema.countries);

  const idToIso3Map = new Map(countryIdToIso3.map(c => [c.id, c.iso3]));

  // Build PIN map from HAPI data
  const pinMap = new Map<string, number>();
  for (const p of pinData) {
    const iso3 = idToIso3Map.get(p.countryId);
    if (iso3 && p.peopleInNeed) {
      pinMap.set(iso3, p.peopleInNeed);
    }
  }

  // Build refugee map from UNHCR data (separate metric - refugees hosted)
  const refugeeMap = new Map<string, number>();
  for (const r of refugeeData) {
    const iso3 = idToIso3Map.get(r.countryId);
    if (iso3) {
      const total = r.totalRefugeesAndAsylum || ((r.refugees || 0) + (r.asylumSeekers || 0));
      if (total > 0) {
        refugeeMap.set(iso3, total);
      }
    }
  }

  // Combine data - PIN and refugees are separate metrics
  const countries = countriesData
    .filter(c => c.iso3 && c.name)
    .map(c => {
      const peopleInNeed = pinMap.get(c.iso3!) || 0;
      const refugeesHosted = refugeeMap.get(c.iso3!) || 0;

      return {
        iso3: c.iso3!,
        name: c.name!,
        totalFunding: Number(c.totalFunding) || 0,
        flowCount: Number(c.flowCount) || 0,
        donorCount: Number(c.donorCount) || 0,
        peopleInNeed,        // From HAPI humanitarian needs assessments
        refugeesHosted,      // From UNHCR - refugees hosted in this country
        // Only calculate $/person based on PIN (humanitarian needs), not refugees hosted
        fundingPerPerson: peopleInNeed > 0 ? Number(c.totalFunding) / peopleInNeed : null,
      };
    });

  const totalFunding = countries.reduce((sum, c) => sum + c.totalFunding, 0);
  const totalCountries = countries.length;

  return {
    selectedYear,
    availableYears,
    countries,
    totalFunding,
    totalCountries,
  };
};
