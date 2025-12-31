/**
 * IPC Food Insecurity Data Ingestion Script
 * Fetches IPC Acute Food Insecurity data from HDX
 *
 * Data Source: https://data.humdata.org/dataset/ipc-country-data
 * IPC Phases:
 *   - Phase 1: Minimal
 *   - Phase 2: Stressed
 *   - Phase 3: Crisis
 *   - Phase 4: Emergency
 *   - Phase 5: Famine/Catastrophe
 *
 * Phase 3+ (Crisis and above) is the key humanitarian metric
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema.js';
import * as XLSX from 'xlsx';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// HDX Dataset download URL
const IPC_DATA_URL = 'https://data.humdata.org/dataset/1237f795-64fe-4acf-9706-a212abde80e8/resource/3f1a4518-4d4c-42bb-b61c-dc3813843041/download/all-countries-2017-2023.xlsx';

// Alternative: Try to fetch more recent data from HDX API
const HDX_API_URL = 'https://data.humdata.org/api/3/action/package_show?id=ipc-country-data';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface IPCRow {
  country: string;
  iso3: string;
  year: number;
  period?: string;
  phase1?: number;
  phase2?: number;
  phase3?: number;
  phase4?: number;
  phase5?: number;
  phase3Plus?: number;
  totalAnalyzed?: number;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  console.log(`  Fetching: ${url.substring(0, 80)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

function parseNumber(value: any): number | null {
  if (value === undefined || value === null || value === '-' || value === '' || value === 'NA') {
    return null;
  }
  const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : Number(value);
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

// Country name to ISO3 mapping for IPC data
const COUNTRY_NAME_TO_ISO3: Record<string, string> = {
  'afghanistan': 'AFG',
  'angola': 'AGO',
  'bangladesh': 'BGD',
  'burkina faso': 'BFA',
  'burundi': 'BDI',
  'cameroon': 'CMR',
  'car': 'CAF',
  'central african republic': 'CAF',
  'chad': 'TCD',
  'drc': 'COD',
  'congo, drc': 'COD',
  'democratic republic of the congo': 'COD',
  'democratic republic of congo': 'COD',
  'djibouti': 'DJI',
  'dominican republic': 'DOM',
  'el salvador': 'SLV',
  'ethiopia': 'ETH',
  'guatemala': 'GTM',
  'haiti': 'HTI',
  'honduras': 'HND',
  'kenya': 'KEN',
  'lesotho': 'LSO',
  'liberia': 'LBR',
  'madagascar': 'MDG',
  'malawi': 'MWI',
  'mali': 'MLI',
  'mauritania': 'MRT',
  'mozambique': 'MOZ',
  'myanmar': 'MMR',
  'nicaragua': 'NIC',
  'niger': 'NER',
  'nigeria': 'NGA',
  'pakistan': 'PAK',
  'palestine': 'PSE',
  'state of palestine': 'PSE',
  'senegal': 'SEN',
  'sierra leone': 'SLE',
  'somalia': 'SOM',
  'south sudan': 'SSD',
  'sudan': 'SDN',
  'syria': 'SYR',
  'syrian arab republic': 'SYR',
  'tanzania': 'TZA',
  'united republic of tanzania': 'TZA',
  'uganda': 'UGA',
  'ukraine': 'UKR',
  'yemen': 'YEM',
  'zambia': 'ZMB',
  'zimbabwe': 'ZWE',
  'eswatini': 'SWZ',
  'swaziland': 'SWZ',
  'gambia': 'GMB',
  'the gambia': 'GMB',
  'guinea': 'GIN',
  'guinea-bissau': 'GNB',
  'togo': 'TGO',
  'benin': 'BEN',
  'congo': 'COG',
  'republic of congo': 'COG',
  'cote d\'ivoire': 'CIV',
  'ivory coast': 'CIV',
  'ghana': 'GHA',
  'rwanda': 'RWA',
  'namibia': 'NAM',
  'botswana': 'BWA',
  'south africa': 'ZAF',
  'egypt': 'EGY',
  'iraq': 'IRQ',
  'jordan': 'JOR',
  'lebanon': 'LBN',
  'libya': 'LBY',
  'nepal': 'NPL',
  'philippines': 'PHL',
  'sri lanka': 'LKA',
  'timor-leste': 'TLS',
  'east timor': 'TLS',
  'papua new guinea': 'PNG',
  'laos': 'LAO',
  'lao pdr': 'LAO',
  'cambodia': 'KHM',
  'indonesia': 'IDN',
  'colombia': 'COL',
  'venezuela': 'VEN',
  'peru': 'PER',
  'ecuador': 'ECU',
  'bolivia': 'BOL',
};

function normalizeCountryName(name: string): string {
  return name.toLowerCase().trim();
}

function getIso3FromCountryName(name: string): string | null {
  // First check if it's already an ISO3 code
  if (name.length === 3 && name === name.toUpperCase()) {
    return name;
  }

  const normalized = normalizeCountryName(name);
  return COUNTRY_NAME_TO_ISO3[normalized] || null;
}

// ═══════════════════════════════════════════════════════════
// FETCH LATEST DATA URL FROM HDX
// ═══════════════════════════════════════════════════════════

async function getLatestDataUrl(): Promise<string> {
  try {
    console.log('  Checking HDX for latest IPC data...');
    const response = await fetch(HDX_API_URL);
    if (!response.ok) {
      console.log('  Could not fetch HDX metadata, using default URL');
      return IPC_DATA_URL;
    }

    const data = await response.json();
    const resources = data.result?.resources || [];

    // Find the Excel file resource
    for (const resource of resources) {
      if (resource.format?.toLowerCase() === 'xlsx' ||
          resource.url?.endsWith('.xlsx')) {
        console.log(`  Found latest data: ${resource.name || resource.url}`);
        return resource.url;
      }
    }

    return IPC_DATA_URL;
  } catch (error) {
    console.log('  Error checking HDX, using default URL');
    return IPC_DATA_URL;
  }
}

// ═══════════════════════════════════════════════════════════
// PARSE EXCEL DATA
// ═══════════════════════════════════════════════════════════

function parseIPCExcel(buffer: ArrayBuffer): IPCRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const rows: IPCRow[] = [];

  console.log(`  Sheets found: ${workbook.SheetNames.join(', ')}`);

  const sheetName = 'IPC';
  const sheet = workbook.Sheets[sheetName];

  // Parse as array of arrays (header: 1), starting from row 12 (data starts there)
  // Column structure (from analysis):
  // 0: Country/Analysis name (e.g., "Afghanistan: Acute Food Insecurity September 2022")
  // 1: Level 1 Name (empty for national level)
  // 5: Date of Analysis
  // 7: Population Analysed (#)
  // 10: Analysis Period
  // 11: Phase 1 (#)
  // 13: Phase 2 (#)
  // 15: Phase 3 (#)
  // 17: Phase 4 (#)
  // 19: Phase 5 (#)
  // 21: Phase 3+ (#)

  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 12,  // Start from row 12 (0-indexed), which is the first data row
    defval: null
  }) as any[][];

  console.log(`  Found ${jsonData.length} data rows`);

  let nationalRowCount = 0;

  for (const row of jsonData) {
    if (!row || row.length < 22) continue;

    const analysisName = String(row[0] || '');
    const level1Name = row[1];

    // Only process national-level rows (Level 1 Name is empty/null, and analysis name contains ":")
    // National rows have format: "Country: Acute Food Insecurity Month Year"
    if (level1Name || !analysisName.includes(':')) {
      continue;
    }

    // Extract country name from analysis name
    const countryMatch = analysisName.match(/^([^:]+):/);
    if (!countryMatch) continue;

    const countryName = countryMatch[1].trim();
    const iso3 = getIso3FromCountryName(countryName);

    if (!iso3) {
      continue;
    }

    // Extract year from date column or analysis name
    const dateStr = String(row[5] || '');
    const yearMatch = dateStr.match(/\b(20\d{2})\b/) || analysisName.match(/\b(20\d{2})\b/);
    if (!yearMatch) continue;

    const year = parseInt(yearMatch[1], 10);

    const totalAnalyzed = parseNumber(row[7]);
    const period = String(row[10] || '');
    const phase1 = parseNumber(row[11]);
    const phase2 = parseNumber(row[13]);
    const phase3 = parseNumber(row[15]);
    const phase4 = parseNumber(row[17]);
    const phase5 = parseNumber(row[19]);
    const phase3Plus = parseNumber(row[21]);

    // Only include rows with meaningful food insecurity data
    if (phase3Plus || phase3 || phase4 || phase5) {
      rows.push({
        country: countryName,
        iso3,
        year,
        period: period || undefined,
        phase1,
        phase2,
        phase3,
        phase4,
        phase5,
        phase3Plus,
        totalAnalyzed,
      });
      nationalRowCount++;
    }
  }

  console.log(`  National-level rows with food insecurity data: ${nationalRowCount}`);

  return rows;
}

// ═══════════════════════════════════════════════════════════
// MAIN INGESTION FUNCTION
// ═══════════════════════════════════════════════════════════

async function ingestIPCData() {
  console.log('\n🍽️  Ingesting IPC food insecurity data...');

  // Get country lookup
  const countries = await db.select().from(schema.countries);
  const countryByIso3 = new Map(countries.map(c => [c.iso3, c.id]));

  console.log(`   Found ${countryByIso3.size} countries in database`);

  // Get latest data URL from HDX
  const dataUrl = await getLatestDataUrl();

  // Download the Excel file
  const buffer = await fetchBuffer(dataUrl);

  // Parse the Excel data
  const ipcRows = parseIPCExcel(buffer);

  console.log(`\n   Parsed ${ipcRows.length} IPC records`);

  // Group by country and year (take latest analysis if multiple)
  const byCountryYear = new Map<string, IPCRow>();
  for (const row of ipcRows) {
    const key = `${row.iso3}-${row.year}`;
    const existing = byCountryYear.get(key);
    // Keep the one with higher phase3Plus (more recent/severe estimate)
    if (!existing || (row.phase3Plus || 0) > (existing.phase3Plus || 0)) {
      byCountryYear.set(key, row);
    }
  }

  console.log(`   Unique country-year records: ${byCountryYear.size}`);

  let totalInserted = 0;
  let skippedNoCountry = 0;

  for (const row of byCountryYear.values()) {
    const countryId = countryByIso3.get(row.iso3);
    if (!countryId) {
      skippedNoCountry++;
      continue;
    }

    await db.insert(schema.foodInsecurity).values({
      countryId,
      year: row.year,
      analysisPeriod: row.period || null,
      phase1: row.phase1,
      phase2: row.phase2,
      phase3: row.phase3,
      phase4: row.phase4,
      phase5: row.phase5,
      phase3Plus: row.phase3Plus,
      totalAnalyzed: row.totalAnalyzed,
      source: 'ipc',
    }).onConflictDoUpdate({
      target: [schema.foodInsecurity.countryId, schema.foodInsecurity.year],
      set: {
        analysisPeriod: row.period || null,
        phase1: row.phase1,
        phase2: row.phase2,
        phase3: row.phase3,
        phase4: row.phase4,
        phase5: row.phase5,
        phase3Plus: row.phase3Plus,
        totalAnalyzed: row.totalAnalyzed,
        updatedAt: new Date(),
      }
    });
    totalInserted++;
  }

  console.log(`\n   Inserted/updated: ${totalInserted} records`);
  if (skippedNoCountry > 0) {
    console.log(`   Skipped (country not in DB): ${skippedNoCountry}`);
  }

  await logSync('ipc_food_insecurity', 'completed', totalInserted);

  return totalInserted;
}

// ═══════════════════════════════════════════════════════════
// SUMMARY REPORT
// ═══════════════════════════════════════════════════════════

async function printSummary() {
  console.log('\n📊 IPC Food Insecurity Summary:');

  const { eq, desc, sql: sqlFn } = await import('drizzle-orm');

  // Get most recent year's data
  const latestYear = await db
    .select({ year: schema.foodInsecurity.year })
    .from(schema.foodInsecurity)
    .orderBy(desc(schema.foodInsecurity.year))
    .limit(1);

  const year = latestYear[0]?.year || 2023;
  console.log(`\n   Latest year with data: ${year}`);

  const topCountries = await db
    .select({
      name: schema.countries.name,
      iso3: schema.countries.iso3,
      year: schema.foodInsecurity.year,
      phase3Plus: schema.foodInsecurity.phase3Plus,
      phase4: schema.foodInsecurity.phase4,
      phase5: schema.foodInsecurity.phase5,
      totalAnalyzed: schema.foodInsecurity.totalAnalyzed,
    })
    .from(schema.foodInsecurity)
    .innerJoin(schema.countries, eq(schema.foodInsecurity.countryId, schema.countries.id))
    .where(eq(schema.foodInsecurity.year, year))
    .orderBy(desc(schema.foodInsecurity.phase3Plus))
    .limit(15);

  console.log('\n   Top 15 Countries by Food Insecurity (Phase 3+):');
  console.log('   ─────────────────────────────────────────────────────────');
  console.log('   ISO  Country                        Phase3+      P4+P5  ');
  console.log('   ─────────────────────────────────────────────────────────');

  for (const row of topCountries) {
    const p3Plus = Number(row.phase3Plus || 0);
    const p4p5 = (Number(row.phase4 || 0) + Number(row.phase5 || 0));

    const p3Str = p3Plus >= 1_000_000
      ? `${(p3Plus / 1_000_000).toFixed(1)}M`
      : p3Plus >= 1_000
        ? `${(p3Plus / 1_000).toFixed(0)}K`
        : String(p3Plus);

    const p4p5Str = p4p5 >= 1_000_000
      ? `${(p4p5 / 1_000_000).toFixed(1)}M`
      : p4p5 >= 1_000
        ? `${(p4p5 / 1_000).toFixed(0)}K`
        : String(p4p5);

    console.log(`   ${row.iso3}  ${(row.name || '').padEnd(30)} ${p3Str.padStart(8)}  ${p4p5Str.padStart(8)}`);
  }

  // Count total people in Phase 3+
  const totalResult = await db
    .select({
      total: sqlFn<number>`SUM(${schema.foodInsecurity.phase3Plus})`,
    })
    .from(schema.foodInsecurity)
    .where(eq(schema.foodInsecurity.year, year));

  const totalP3Plus = Number(totalResult[0]?.total || 0);
  console.log(`\n   Total people in Phase 3+ (${year}): ${(totalP3Plus / 1_000_000).toFixed(1)}M`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IPC FOOD INSECURITY DATA INGESTION');
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  try {
    await ingestIPCData();
    await printSummary();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  ✅ IPC INGESTION COMPLETE (${elapsed}s)`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    await logSync('ipc_food_insecurity', 'failed', undefined, String(error));
    process.exit(1);
  }
}

main();
