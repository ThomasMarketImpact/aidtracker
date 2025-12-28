/**
 * Quick script to ingest just 2025 flow data
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sum } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient, { schema });

const FTS_BASE = 'https://api.hpc.tools';

interface SourceDestObject {
  type: string;
  id: string;
  name: string;
}

interface FTSFlow {
  id: string;
  amountUSD: number;
  status: string;
  sourceObjects: SourceDestObject[];
  destinationObjects: SourceDestObject[];
}

let orgByFtsId: Map<number, number>;
let countryByFtsId: Map<number, number>;
let sectorByCode: Map<string, number>;
let planByFtsId: Map<number, number>;

async function loadLookups() {
  console.log('Loading lookups...');
  const orgs = await db.select({ id: schema.organizations.id, ftsId: schema.organizations.ftsOrgId }).from(schema.organizations);
  orgByFtsId = new Map(orgs.filter(o => o.ftsId).map(o => [o.ftsId!, o.id]));

  const countries = await db.select({ id: schema.countries.id, ftsId: schema.countries.ftsLocationId }).from(schema.countries);
  countryByFtsId = new Map(countries.filter(c => c.ftsId).map(c => [c.ftsId!, c.id]));

  const sectors = await db.select({ id: schema.sectors.id, code: schema.sectors.code }).from(schema.sectors);
  sectorByCode = new Map(sectors.map(s => [s.code, s.id]));

  const plans = await db.select({ id: schema.plans.id, ftsId: schema.plans.ftsPlanId }).from(schema.plans);
  planByFtsId = new Map(plans.filter(p => p.ftsId).map(p => [p.ftsId!, p.id]));
}

async function fetchFlows2025(): Promise<FTSFlow[]> {
  const allFlows: FTSFlow[] = [];
  let page = 1;
  const limit = 1000;

  while (true) {
    const url = `${FTS_BASE}/v1/public/fts/flow?year=2025&limit=${limit}&page=${page}`;
    console.log(`Fetching page ${page}...`);

    const response = await fetch(url);
    const data = await response.json();
    const flows = data.data?.flows || [];

    if (flows.length === 0) break;
    allFlows.push(...flows);
    if (flows.length < limit) break;
    page++;
    await new Promise(r => setTimeout(r, 100));
  }

  return allFlows;
}

async function main() {
  console.log('Ingesting 2025 flow data...\n');

  await loadLookups();

  // Delete existing 2025 data
  await db.delete(schema.flowSummaries).where(eq(schema.flowSummaries.year, 2025));

  const flows = await fetchFlows2025();
  console.log(`\nFetched ${flows.length} flows for 2025`);

  // Aggregate
  const aggregations = new Map<string, any>();

  for (const flow of flows) {
    const donorOrg = flow.sourceObjects?.find(o => o.type === 'Organization');
    const donorOrgId = donorOrg ? orgByFtsId.get(parseInt(donorOrg.id)) : null;
    const donorCountry = flow.sourceObjects?.find(o => o.type === 'Location');
    const donorCountryId = donorCountry ? countryByFtsId.get(parseInt(donorCountry.id)) : null;
    const recipientOrg = flow.destinationObjects?.find(o => o.type === 'Organization');
    const recipientOrgId = recipientOrg ? orgByFtsId.get(parseInt(recipientOrg.id)) : null;
    const recipientCountry = flow.destinationObjects?.find(o => o.type === 'Location');
    const recipientCountryId = recipientCountry ? countryByFtsId.get(parseInt(recipientCountry.id)) : null;
    const cluster = flow.destinationObjects?.find(o => o.type === 'GlobalCluster');
    const sectorId = cluster ? sectorByCode.get(cluster.name) : null;
    const plan = flow.destinationObjects?.find(o => o.type === 'Plan');
    const planId = plan ? planByFtsId.get(parseInt(plan.id)) : null;

    const key = `2025|${donorOrgId || 'null'}|${recipientCountryId || 'null'}|${sectorId || 'null'}|${planId || 'null'}`;

    if (!aggregations.has(key)) {
      aggregations.set(key, {
        year: 2025,
        donorOrgId,
        donorCountryId,
        recipientOrgId,
        recipientCountryId,
        sectorId,
        planId,
        totalAmountUsd: 0,
        flowCount: 0,
        commitmentAmount: 0,
        paidAmount: 0,
        pledgeAmount: 0,
      });
    }

    const agg = aggregations.get(key);
    agg.totalAmountUsd += flow.amountUSD || 0;
    agg.flowCount++;
    if (flow.status === 'commitment') agg.commitmentAmount += flow.amountUSD || 0;
    if (flow.status === 'paid') agg.paidAmount += flow.amountUSD || 0;
    if (flow.status === 'pledge') agg.pledgeAmount += flow.amountUSD || 0;
  }

  console.log(`Aggregated to ${aggregations.size} records`);

  // Insert
  let inserted = 0;
  for (const agg of aggregations.values()) {
    await db.insert(schema.flowSummaries).values({
      year: agg.year,
      donorOrgId: agg.donorOrgId,
      donorCountryId: agg.donorCountryId,
      recipientOrgId: agg.recipientOrgId,
      recipientCountryId: agg.recipientCountryId,
      sectorId: agg.sectorId,
      planId: agg.planId,
      totalAmountUsd: agg.totalAmountUsd.toString(),
      flowCount: agg.flowCount,
      commitmentAmount: agg.commitmentAmount.toString(),
      paidAmount: agg.paidAmount.toString(),
      pledgeAmount: agg.pledgeAmount.toString(),
    });
    inserted++;
    if (inserted % 500 === 0) console.log(`  Inserted ${inserted}...`);
  }

  console.log(`\n✅ Done! Inserted ${inserted} aggregated records for 2025`);

  // Verify
  const total = await db.select({ sum: sum(schema.flowSummaries.totalAmountUsd) })
    .from(schema.flowSummaries)
    .where(eq(schema.flowSummaries.year, 2025));

  console.log(`Total 2025 funding: $${(Number(total[0].sum) / 1e9).toFixed(2)}B`);
}

main().catch(console.error);
