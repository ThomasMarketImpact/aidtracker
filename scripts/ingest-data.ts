/**
 * Data Ingestion Pipeline
 * Loads FTS and HAPI data into Neon PostgreSQL
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const FTS_BASE = 'https://api.hpc.tools';
const HAPI_BASE = 'https://hapi.humdata.org/api/v2';
const HAPI_APP_ID = process.env.HAPI_APP_ID || 'ZnRzLW5lZWRzLWRhc2hib2FyZDpmdHMtcHJvamVjdEBleGFtcGxlLmNvbQ==';

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`  Fetching: ${url.substring(0, 80)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function logSync(type: string, status: string, records?: number, error?: string) {
  await db.insert(schema.dataSyncLog).values({
    syncType: type,
    status,
    recordsProcessed: records,
    errorMessage: error,
    startedAt: new Date(),
    completedAt: status !== 'running' ? new Date() : undefined,
  });
}

// ═══════════════════════════════════════════════════════════
// 1. INGEST COUNTRIES (from FTS locations + HAPI)
// ═══════════════════════════════════════════════════════════

async function ingestCountries() {
  console.log('\n📍 Ingesting countries...');

  // Get FTS locations
  const ftsData = await fetchJson<{ data: any[] }>(`${FTS_BASE}/v2/public/location`);

  // Get HAPI locations for HRP/GHO flags
  const hapiUrl = `${HAPI_BASE}/metadata/location?app_identifier=${HAPI_APP_ID}&output_format=json&limit=300`;
  const hapiData = await fetchJson<{ data: any[] }>(hapiUrl);

  // Create HAPI lookup
  const hapiLookup = new Map<string, { has_hrp: boolean; in_gho: boolean }>();
  for (const loc of hapiData.data) {
    hapiLookup.set(loc.code, { has_hrp: loc.has_hrp, in_gho: loc.in_gho });
  }

  let inserted = 0;
  for (const loc of ftsData.data) {
    if (!loc.iso3) continue; // Skip regions without ISO3

    const hapiInfo = hapiLookup.get(loc.iso3);

    await db.insert(schema.countries).values({
      ftsLocationId: loc.id,
      iso3: loc.iso3,
      name: loc.name,
      hasHrp: hapiInfo?.has_hrp || false,
      inGho: hapiInfo?.in_gho || false,
    }).onConflictDoUpdate({
      target: schema.countries.iso3,
      set: {
        name: loc.name,
        ftsLocationId: loc.id,
        hasHrp: hapiInfo?.has_hrp || false,
        inGho: hapiInfo?.in_gho || false,
      }
    });
    inserted++;
  }

  console.log(`  Inserted/updated ${inserted} countries`);
  await logSync('countries', 'completed', inserted);
  return inserted;
}

// ═══════════════════════════════════════════════════════════
// 2. INGEST SECTORS (from FTS global clusters)
// ═══════════════════════════════════════════════════════════

async function ingestSectors() {
  console.log('\n🏷️ Ingesting sectors...');

  const data = await fetchJson<{ data: any[] }>(`${FTS_BASE}/v1/public/global-cluster`);

  let inserted = 0;
  for (const cluster of data.data) {
    await db.insert(schema.sectors).values({
      code: cluster.code,
      name: cluster.name,
      isGlobalCluster: true,
    }).onConflictDoUpdate({
      target: schema.sectors.code,
      set: { name: cluster.name }
    });
    inserted++;
  }

  // Add HAPI-specific sectors
  const hapiSectors = [
    { code: 'Intersectoral', name: 'Intersectoral' },
    { code: 'Multi', name: 'Multi-sector (unspecified)' },
    { code: 'Cash', name: 'Cash' },
    { code: 'ERY', name: 'Early Recovery' },
  ];

  for (const s of hapiSectors) {
    await db.insert(schema.sectors).values({
      code: s.code,
      name: s.name,
      isGlobalCluster: false,
    }).onConflictDoNothing();
    inserted++;
  }

  console.log(`  Inserted/updated ${inserted} sectors`);
  await logSync('sectors', 'completed', inserted);
  return inserted;
}

// ═══════════════════════════════════════════════════════════
// 3. INGEST ORGANIZATIONS (from FTS)
// ═══════════════════════════════════════════════════════════

async function ingestOrganizations() {
  console.log('\n🏢 Ingesting organizations...');

  const data = await fetchJson<{ data: any[] }>(`${FTS_BASE}/v1/public/organization`);

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < data.data.length; i += batchSize) {
    const batch = data.data.slice(i, i + batchSize);

    for (const org of batch) {
      const orgType = org.categories?.find((c: any) => c.group === 'organizationType')?.name;
      const orgSubType = org.categories?.find((c: any) => c.group === 'organizationSubType')?.name;

      await db.insert(schema.organizations).values({
        ftsOrgId: org.id,
        name: org.name,
        abbreviation: org.abbreviation,
        orgType: orgType,
        orgSubType: orgSubType,
      }).onConflictDoUpdate({
        target: schema.organizations.ftsOrgId,
        set: {
          name: org.name,
          abbreviation: org.abbreviation,
          orgType: orgType,
          orgSubType: orgSubType,
        }
      });
      inserted++;
    }

    if (i % 1000 === 0 && i > 0) {
      console.log(`    Processed ${i} organizations...`);
    }
  }

  console.log(`  Inserted/updated ${inserted} organizations`);
  await logSync('organizations', 'completed', inserted);
  return inserted;
}

// ═══════════════════════════════════════════════════════════
// 4. INGEST PLANS (from FTS)
// ═══════════════════════════════════════════════════════════

async function ingestPlans() {
  console.log('\n📋 Ingesting plans...');

  const data = await fetchJson<{ data: any[] }>(`${FTS_BASE}/v2/public/plan`);

  // Get country lookup
  const countries = await db.select().from(schema.countries);
  const countryByFtsId = new Map(countries.map(c => [c.ftsLocationId, c.id]));

  let inserted = 0;
  for (const plan of data.data) {
    const year = plan.years?.[0]?.year;
    const location = plan.locations?.[0];
    const countryId = location ? countryByFtsId.get(location.id) : undefined;

    const planType = plan.categories?.find((c: any) => c.group === 'planType')?.name;

    await db.insert(schema.plans).values({
      ftsPlanId: plan.id,
      name: plan.planVersion?.name || `Plan ${plan.id}`,
      shortName: plan.planVersion?.shortName,
      year: typeof year === 'string' ? parseInt(year) : year,
      countryId: countryId,
      planType: planType,
      origRequirements: plan.origRequirements?.toString(),
      revisedRequirements: plan.revisedRequirements?.toString(),
      isReleased: plan.isReleased,
    }).onConflictDoUpdate({
      target: schema.plans.ftsPlanId,
      set: {
        name: plan.planVersion?.name || `Plan ${plan.id}`,
        year: typeof year === 'string' ? parseInt(year) : year,
        origRequirements: plan.origRequirements?.toString(),
        revisedRequirements: plan.revisedRequirements?.toString(),
      }
    });
    inserted++;
  }

  console.log(`  Inserted/updated ${inserted} plans`);
  await logSync('plans', 'completed', inserted);
  return inserted;
}

// ═══════════════════════════════════════════════════════════
// 5. INGEST HUMANITARIAN NEEDS (from HAPI)
// ═══════════════════════════════════════════════════════════

async function ingestHumanitarianNeeds() {
  console.log('\n👥 Ingesting humanitarian needs...');

  // Get country and sector lookups
  const countries = await db.select().from(schema.countries);
  const countryByIso3 = new Map(countries.map(c => [c.iso3, c.id]));

  const sectors = await db.select().from(schema.sectors);
  const sectorByCode = new Map(sectors.map(s => [s.code, s.id]));

  // Fetch HAPI humanitarian needs (national level)
  const url = `${HAPI_BASE}/affected-people/humanitarian-needs?app_identifier=${HAPI_APP_ID}&output_format=json&admin_level=0&limit=10000`;
  const data = await fetchJson<{ data: any[] }>(url);

  let inserted = 0;
  const processedKeys = new Set<string>();

  for (const record of data.data) {
    const countryId = countryByIso3.get(record.location_code);
    if (!countryId) continue;

    const year = parseInt(record.reference_period_start.substring(0, 4));

    // Map sector codes
    let sectorCode = record.sector_code;
    // Handle sub-sectors
    if (sectorCode.startsWith('PRO-')) {
      sectorCode = 'PRO'; // Map protection sub-sectors to Protection
    }

    const sectorId = sectorByCode.get(sectorCode) || sectorByCode.get('Intersectoral');

    // Create unique key for this combination
    const key = `${countryId}-${year}-${sectorId || 'null'}`;

    // Skip if category is not empty (we want overall figures, not age breakdowns)
    if (record.category !== '') continue;

    // Aggregate by status type
    if (!processedKeys.has(key)) {
      const needsForKey = data.data.filter(d =>
        d.location_code === record.location_code &&
        d.reference_period_start.startsWith(String(year)) &&
        d.sector_code === record.sector_code &&
        d.category === ''
      );

      const pin = needsForKey.find(d => d.population_status === 'INN')?.population;
      const targeted = needsForKey.find(d => d.population_status === 'TGT')?.population;
      const reached = needsForKey.find(d => d.population_status === 'REA')?.population;
      const total = needsForKey.find(d => d.population_status === 'all')?.population;

      if (pin || targeted || reached) {
        await db.insert(schema.humanitarianNeeds).values({
          countryId,
          year,
          sectorId,
          peopleInNeed: pin,
          peopleTargeted: targeted,
          peopleReached: reached,
          totalPopulation: total,
          source: 'hapi',
        }).onConflictDoUpdate({
          target: [schema.humanitarianNeeds.countryId, schema.humanitarianNeeds.year, schema.humanitarianNeeds.sectorId],
          set: {
            peopleInNeed: pin,
            peopleTargeted: targeted,
            peopleReached: reached,
            totalPopulation: total,
            updatedAt: new Date(),
          }
        });
        inserted++;
      }

      processedKeys.add(key);
    }
  }

  console.log(`  Inserted/updated ${inserted} humanitarian needs records`);
  await logSync('humanitarian_needs', 'completed', inserted);
  return inserted;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FTS DATA INGESTION PIPELINE');
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  try {
    // 1. Reference data
    await ingestCountries();
    await ingestSectors();
    await ingestOrganizations();
    await ingestPlans();

    // 2. Needs data
    await ingestHumanitarianNeeds();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  ✅ INGESTION COMPLETE (${elapsed}s)`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Next: Run `npm run ingest:flows` to load flow data (takes longer)');

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    await logSync('ingestion', 'failed', undefined, String(error));
    process.exit(1);
  }
}

main();
