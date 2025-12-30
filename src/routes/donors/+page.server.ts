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

  // Get all donors with funding data for selected year
  const donorsData = await db
    .select({
      name: schema.organizations.name,
      type: schema.organizations.orgType,
      totalFunding: sql<number>`sum(${schema.flowSummaries.totalAmountUsd})`.as('total_funding'),
      flowCount: sql<number>`sum(${schema.flowSummaries.flowCount})`.as('flow_count'),
      countryCount: sql<number>`count(distinct ${schema.flowSummaries.recipientCountryId})`.as('country_count'),
    })
    .from(schema.flowSummaries)
    .innerJoin(schema.organizations, eq(schema.flowSummaries.donorOrgId, schema.organizations.id))
    .where(sql`${schema.flowSummaries.year} = ${selectedYear}`)
    .groupBy(schema.organizations.name, schema.organizations.orgType)
    .orderBy(desc(sql`total_funding`))
    .limit(200);

  const donors = donorsData
    .filter(d => d.name)
    .map(d => ({
      name: d.name!,
      type: d.type || 'Unknown',
      totalFunding: Number(d.totalFunding) || 0,
      flowCount: Number(d.flowCount) || 0,
      countryCount: Number(d.countryCount) || 0,
    }));

  const totalFunding = donors.reduce((sum, d) => sum + d.totalFunding, 0);
  const totalDonors = donors.length;

  return {
    selectedYear,
    availableYears,
    donors,
    totalFunding,
    totalDonors,
  };
};
