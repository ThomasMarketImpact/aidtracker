/**
 * UNHCR Refugee Data Ingestion Script
 * Fetches refugee population data from UNHCR's public API
 *
 * API Documentation: https://api.unhcr.org/docs/refugee-statistics.html
 * Data includes: refugees, asylum seekers, IDPs, stateless persons
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema.js';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const UNHCR_API_BASE = 'https://api.unhcr.org/population/v1';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface UNHCRPopulationItem {
  year: number;
  coa_id: number;
  coa_name: string;
  coa: string;
  coa_iso: string;
  refugees: string | number;
  asylum_seekers: string | number;
  returned_refugees: string | number;
  idps: string | number;
  returned_idps: string | number;
  stateless: string | number;
  ooc: string | number; // Other of concern
  oip: string | number; // Others in need of international protection
  hst: string | number; // Host community
}

interface UNHCRResponse {
  page: number;
  maxPages: number;
  total: any[];
  items: UNHCRPopulationItem[];
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`  Fetching: ${url.substring(0, 100)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '-' || value === '') {
    return null;
  }
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? null : num;
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
// MAIN INGESTION FUNCTION
// ═══════════════════════════════════════════════════════════

async function ingestUNHCRData(years: number[] = [2024, 2025]) {
  console.log('\n🌍 Ingesting UNHCR refugee population data...');
  console.log(`   Years: ${years.join(', ')}`);

  // Get country lookup
  const countries = await db.select().from(schema.countries);
  const countryByIso3 = new Map(countries.map(c => [c.iso3, c.id]));

  console.log(`   Found ${countryByIso3.size} countries in database`);

  let totalInserted = 0;

  for (const year of years) {
    console.log(`\n   Processing year ${year}...`);

    // Fetch all countries' data for this year
    // Using coa_all=true to get breakdown by country of asylum
    const url = `${UNHCR_API_BASE}/population/?year=${year}&coa_all=true&limit=500`;

    try {
      const data = await fetchJson<UNHCRResponse>(url);

      console.log(`   Received ${data.items.length} records for ${year}`);

      let yearInserted = 0;

      for (const item of data.items) {
        // Skip aggregated rows (those without a proper ISO code)
        if (!item.coa_iso || item.coa_iso === '-' || item.coa_iso.length !== 3) {
          continue;
        }

        const countryId = countryByIso3.get(item.coa_iso);
        if (!countryId) {
          // Country not in our database, skip
          continue;
        }

        const refugees = parseNumber(item.refugees);
        const asylumSeekers = parseNumber(item.asylum_seekers);
        const idps = parseNumber(item.idps);
        const stateless = parseNumber(item.stateless);
        const returnedRefugees = parseNumber(item.returned_refugees);
        const returnedIdps = parseNumber(item.returned_idps);
        const otherOfConcern = parseNumber(item.ooc);

        // Calculate total refugees + asylum seekers
        const totalRefugeesAndAsylum = (refugees || 0) + (asylumSeekers || 0);

        // Only insert if there's meaningful data
        if (totalRefugeesAndAsylum > 0 || idps || stateless) {
          await db.insert(schema.refugeePopulation).values({
            countryId,
            year: item.year,
            refugees,
            asylumSeekers,
            idps,
            stateless,
            returnedRefugees,
            returnedIdps,
            otherOfConcern,
            totalRefugeesAndAsylum: totalRefugeesAndAsylum > 0 ? totalRefugeesAndAsylum : null,
            source: 'unhcr',
          }).onConflictDoUpdate({
            target: [schema.refugeePopulation.countryId, schema.refugeePopulation.year],
            set: {
              refugees,
              asylumSeekers,
              idps,
              stateless,
              returnedRefugees,
              returnedIdps,
              otherOfConcern,
              totalRefugeesAndAsylum: totalRefugeesAndAsylum > 0 ? totalRefugeesAndAsylum : null,
              updatedAt: new Date(),
            }
          });
          yearInserted++;
        }
      }

      console.log(`   Inserted/updated ${yearInserted} records for ${year}`);
      totalInserted += yearInserted;

    } catch (error) {
      console.error(`   Error fetching data for ${year}:`, error);
    }
  }

  console.log(`\n   Total: ${totalInserted} refugee population records`);
  await logSync('unhcr_refugee_population', 'completed', totalInserted);

  return totalInserted;
}

// ═══════════════════════════════════════════════════════════
// SUMMARY REPORT
// ═══════════════════════════════════════════════════════════

async function printSummary() {
  console.log('\n📊 UNHCR Data Summary:');

  // Get top countries by refugee population using drizzle query builder
  const { eq, desc } = await import('drizzle-orm');

  const topCountries = await db
    .select({
      name: schema.countries.name,
      iso3: schema.countries.iso3,
      year: schema.refugeePopulation.year,
      refugees: schema.refugeePopulation.refugees,
      asylumSeekers: schema.refugeePopulation.asylumSeekers,
      total: schema.refugeePopulation.totalRefugeesAndAsylum,
    })
    .from(schema.refugeePopulation)
    .innerJoin(schema.countries, eq(schema.refugeePopulation.countryId, schema.countries.id))
    .where(eq(schema.refugeePopulation.year, 2024))
    .orderBy(desc(schema.refugeePopulation.totalRefugeesAndAsylum))
    .limit(15);

  console.log('\n   Top 15 Refugee Host Countries (2024):');
  console.log('   ─────────────────────────────────────────────────────');

  for (const row of topCountries) {
    const total = Number(row.total || 0);
    const totalStr = total >= 1_000_000
      ? `${(total / 1_000_000).toFixed(1)}M`
      : total >= 1_000
        ? `${(total / 1_000).toFixed(0)}K`
        : String(total);
    console.log(`   ${row.iso3} ${(row.name || '').padEnd(30)} ${totalStr.padStart(8)} refugees+asylum`);
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  UNHCR REFUGEE DATA INGESTION');
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  // Parse command line arguments for years
  const args = process.argv.slice(2);
  let years = [2024, 2025];

  if (args.length > 0) {
    years = args.map(y => parseInt(y, 10)).filter(y => !isNaN(y));
  }

  try {
    await ingestUNHCRData(years);
    await printSummary();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  ✅ UNHCR INGESTION COMPLETE (${elapsed}s)`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    await logSync('unhcr_refugee_population', 'failed', undefined, String(error));
    process.exit(1);
  }
}

main();
