/**
 * Flow Data Ingestion Pipeline
 * Loads aggregated funding flows from FTS API into Neon PostgreSQL
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, sql as sqlExpr } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient, { schema });

const FTS_BASE = 'https://api.hpc.tools';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

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

interface FlowAggregation {
  year: number;
  donorOrgId: number | null;
  donorCountryId: number | null;
  recipientOrgId: number | null;
  recipientCountryId: number | null;
  sectorId: number | null;
  planId: number | null;
  totalAmountUsd: number;
  flowCount: number;
  commitmentAmount: number;
  paidAmount: number;
  pledgeAmount: number;
}

// ═══════════════════════════════════════════════════════════
// LOOKUP MAPS
// ═══════════════════════════════════════════════════════════

let orgByFtsId: Map<number, number>;
let countryByFtsId: Map<number, number>;
let sectorByCode: Map<string, number>;
let planByFtsId: Map<number, number>;

async function loadLookups() {
  console.log('  Loading lookup tables...');

  const orgs = await db.select({ id: schema.organizations.id, ftsId: schema.organizations.ftsOrgId }).from(schema.organizations);
  orgByFtsId = new Map(orgs.filter(o => o.ftsId).map(o => [o.ftsId!, o.id]));

  const countries = await db.select({ id: schema.countries.id, ftsId: schema.countries.ftsLocationId }).from(schema.countries);
  countryByFtsId = new Map(countries.filter(c => c.ftsId).map(c => [c.ftsId!, c.id]));

  const sectors = await db.select({ id: schema.sectors.id, code: schema.sectors.code }).from(schema.sectors);
  sectorByCode = new Map(sectors.map(s => [s.code, s.id]));

  const plans = await db.select({ id: schema.plans.id, ftsId: schema.plans.ftsPlanId }).from(schema.plans);
  planByFtsId = new Map(plans.filter(p => p.ftsId).map(p => [p.ftsId!, p.id]));

  console.log(`    Organizations: ${orgByFtsId.size}`);
  console.log(`    Countries: ${countryByFtsId.size}`);
  console.log(`    Sectors: ${sectorByCode.size}`);
  console.log(`    Plans: ${planByFtsId.size}`);
}

// ═══════════════════════════════════════════════════════════
// FETCH FLOWS
// ═══════════════════════════════════════════════════════════

async function fetchFlowsForYear(year: number): Promise<FTSFlow[]> {
  const allFlows: FTSFlow[] = [];
  let page = 1;
  const limit = 1000;

  while (true) {
    const url = `${FTS_BASE}/v1/public/fts/flow?year=${year}&limit=${limit}&page=${page}`;
    console.log(`    Fetching page ${page}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const flows = data.data?.flows || [];

    if (flows.length === 0) break;

    allFlows.push(...flows);

    if (flows.length < limit) break;
    page++;

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  return allFlows;
}

// ═══════════════════════════════════════════════════════════
// AGGREGATE FLOWS
// ═══════════════════════════════════════════════════════════

function aggregateFlows(flows: FTSFlow[], year: number): FlowAggregation[] {
  const aggregations = new Map<string, FlowAggregation>();

  for (const flow of flows) {
    // Extract donor (source organization)
    const donorOrg = flow.sourceObjects?.find(o => o.type === 'Organization');
    const donorOrgId = donorOrg ? orgByFtsId.get(parseInt(donorOrg.id)) : null;

    // Extract donor country
    const donorCountry = flow.sourceObjects?.find(o => o.type === 'Location');
    const donorCountryId = donorCountry ? countryByFtsId.get(parseInt(donorCountry.id)) : null;

    // Extract recipient organization
    const recipientOrg = flow.destinationObjects?.find(o => o.type === 'Organization');
    const recipientOrgId = recipientOrg ? orgByFtsId.get(parseInt(recipientOrg.id)) : null;

    // Extract recipient country
    const recipientCountry = flow.destinationObjects?.find(o => o.type === 'Location');
    const recipientCountryId = recipientCountry ? countryByFtsId.get(parseInt(recipientCountry.id)) : null;

    // Extract sector (GlobalCluster)
    const cluster = flow.destinationObjects?.find(o => o.type === 'GlobalCluster');
    const sectorId = cluster ? sectorByCode.get(cluster.name) : null;

    // Extract plan
    const plan = flow.destinationObjects?.find(o => o.type === 'Plan');
    const planId = plan ? planByFtsId.get(parseInt(plan.id)) : null;

    // Create aggregation key
    const key = `${year}|${donorOrgId || 'null'}|${recipientCountryId || 'null'}|${sectorId || 'null'}|${planId || 'null'}`;

    // Aggregate
    if (!aggregations.has(key)) {
      aggregations.set(key, {
        year,
        donorOrgId: donorOrgId || null,
        donorCountryId: donorCountryId || null,
        recipientOrgId: recipientOrgId || null,
        recipientCountryId: recipientCountryId || null,
        sectorId: sectorId || null,
        planId: planId || null,
        totalAmountUsd: 0,
        flowCount: 0,
        commitmentAmount: 0,
        paidAmount: 0,
        pledgeAmount: 0,
      });
    }

    const agg = aggregations.get(key)!;
    agg.totalAmountUsd += flow.amountUSD || 0;
    agg.flowCount++;

    switch (flow.status) {
      case 'commitment':
        agg.commitmentAmount += flow.amountUSD || 0;
        break;
      case 'paid':
        agg.paidAmount += flow.amountUSD || 0;
        break;
      case 'pledge':
        agg.pledgeAmount += flow.amountUSD || 0;
        break;
    }
  }

  return Array.from(aggregations.values());
}

// ═══════════════════════════════════════════════════════════
// INSERT AGGREGATIONS
// ═══════════════════════════════════════════════════════════

async function insertAggregations(aggregations: FlowAggregation[]): Promise<number> {
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < aggregations.length; i += batchSize) {
    const batch = aggregations.slice(i, i + batchSize);

    for (const agg of batch) {
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
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`      Inserted ${i} aggregations...`);
    }
  }

  return inserted;
}

// ═══════════════════════════════════════════════════════════
// LOG SYNC
// ═══════════════════════════════════════════════════════════

async function logSync(type: string, year: number | undefined, status: string, records?: number, error?: string) {
  await db.insert(schema.dataSyncLog).values({
    syncType: type,
    year,
    status,
    recordsProcessed: records,
    errorMessage: error,
    startedAt: new Date(),
    completedAt: status !== 'running' ? new Date() : undefined,
  });
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FTS FLOW INGESTION');
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  // Years to ingest (2016-2025)
  const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];

  try {
    await loadLookups();

    let totalFlows = 0;
    let totalAggregations = 0;

    for (const year of years) {
      console.log(`\n📊 Processing year ${year}...`);

      // Fetch flows first (before any destructive operations)
      const flows = await fetchFlowsForYear(year);
      console.log(`    Fetched ${flows.length} flows`);
      totalFlows += flows.length;

      if (flows.length === 0) {
        console.log(`    ⚠️ No flows found for ${year}, skipping (preserving existing data)`);
        continue;
      }

      // Aggregate the data
      const aggregations = aggregateFlows(flows, year);
      console.log(`    Aggregated to ${aggregations.length} records`);

      // SAFE PATTERN: Delete old data and insert new data
      // If insert fails after delete, we log the error and the year affected
      // This minimizes the window where data could be lost
      try {
        // Delete existing data for this year
        await db.delete(schema.flowSummaries).where(eq(schema.flowSummaries.year, year));

        // Insert new aggregated data
        const inserted = await insertAggregations(aggregations);
        totalAggregations += inserted;

        await logSync('flows', year, 'completed', flows.length);
        console.log(`    ✓ Inserted ${inserted} aggregated flow summaries`);
      } catch (yearError) {
        // Log specific year that failed for easier recovery
        console.error(`    ❌ Failed to process year ${year}:`, yearError);
        await logSync('flows', year, 'failed', undefined, String(yearError));
        throw new Error(`Year ${year} ingestion failed: ${yearError}. Previous years may have been processed successfully.`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  ✅ FLOW INGESTION COMPLETE (${elapsed}s)`);
    console.log(`     Total flows processed: ${totalFlows.toLocaleString()}`);
    console.log(`     Aggregated records: ${totalAggregations.toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Flow ingestion failed:', error);
    await logSync('flows', undefined, 'failed', undefined, String(error));
    process.exit(1);
  }
}

main();
