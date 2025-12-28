/**
 * Phase 0: HAPI Data Download
 * Downloads humanitarian needs data from HDX HAPI API
 */

import { writeFile, mkdir } from 'fs/promises';

const OUTPUT_DIR = './scripts/data/raw';
const HAPI_BASE = 'https://hapi.humdata.org/api/v2';

// App identifier (base64 of "fts-needs-dashboard:fts-project@example.com")
const APP_ID = 'ZnRzLW5lZWRzLWRhc2hib2FyZDpmdHMtcHJvamVjdEBleGFtcGxlLmNvbQ==';

interface HapiResponse<T> {
  data: T[];
}

interface HapiLocation {
  id: number;
  code: string;
  name: string;
  has_hrp: boolean;
  in_gho: boolean;
  from_cods: boolean;
  reference_period_start: string;
  reference_period_end: string | null;
}

interface HapiHumanitarianNeeds {
  location_code: string;
  location_name: string;
  admin1_code: string | null;
  admin1_name: string | null;
  admin2_code: string | null;
  admin2_name: string | null;
  admin_level: number;
  resource_hdx_id: string;
  sector_code: string;
  sector_name: string;
  category: string;
  population_status: string; // INN, TGT, REA, all
  population: number;
  reference_period_start: string;
  reference_period_end: string;
}

async function fetchHapi<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const url = new URL(`${HAPI_BASE}${endpoint}`);
  url.searchParams.set('app_identifier', APP_ID);
  url.searchParams.set('output_format', 'json');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  console.log(`  Fetching: ${endpoint}...`);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HAPI ${response.status}: ${response.statusText}`);
  }

  const json = await response.json() as HapiResponse<T>;
  return json.data;
}

async function fetchAllPages<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const allData: T[] = [];
  let offset = 0;
  const limit = 10000;

  while (true) {
    const data = await fetchHapi<T>(endpoint, { ...params, limit, offset });
    allData.push(...data);

    if (data.length < limit) {
      break;
    }

    offset += limit;
    console.log(`    Fetched ${allData.length} records so far...`);
    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return allData;
}

async function downloadLocations(): Promise<HapiLocation[]> {
  console.log('\n📍 Downloading HAPI Locations...');
  const locations = await fetchAllPages<HapiLocation>('/metadata/location');

  // Filter to GHO/HRP countries
  const ghoCountries = locations.filter(l => l.in_gho || l.has_hrp);

  console.log(`  Total locations: ${locations.length}`);
  console.log(`  GHO countries: ${ghoCountries.length}`);
  console.log(`  HRP countries: ${locations.filter(l => l.has_hrp).length}`);

  await writeFile(`${OUTPUT_DIR}/hapi_locations.json`, JSON.stringify(locations, null, 2));
  await writeFile(`${OUTPUT_DIR}/hapi_gho_countries.json`, JSON.stringify(ghoCountries, null, 2));

  return locations;
}

async function downloadHumanitarianNeeds(): Promise<HapiHumanitarianNeeds[]> {
  console.log('\n👥 Downloading Humanitarian Needs (national level)...');

  // Get national-level (admin_level=0) data for all countries
  const needs = await fetchAllPages<HapiHumanitarianNeeds>(
    '/affected-people/humanitarian-needs',
    { admin_level: 0 }
  );

  console.log(`  Total records: ${needs.length}`);

  // Analyze the data
  const countries = new Set(needs.map(n => n.location_code));
  const sectors = new Set(needs.map(n => n.sector_code));
  const statuses = new Set(needs.map(n => n.population_status));
  const years = new Set(needs.map(n => n.reference_period_start.substring(0, 4)));

  console.log(`  Countries: ${countries.size}`);
  console.log(`  Sectors: ${[...sectors].join(', ')}`);
  console.log(`  Population statuses: ${[...statuses].join(', ')}`);
  console.log(`  Years: ${[...years].join(', ')}`);

  await writeFile(`${OUTPUT_DIR}/hapi_humanitarian_needs.json`, JSON.stringify(needs, null, 2));

  return needs;
}

async function downloadIntersectoralPiN(): Promise<void> {
  console.log('\n🎯 Extracting Intersectoral People in Need...');

  // Read the downloaded needs data
  const needs = JSON.parse(
    await import('fs/promises').then(fs =>
      fs.readFile(`${OUTPUT_DIR}/hapi_humanitarian_needs.json`, 'utf-8')
    )
  ) as HapiHumanitarianNeeds[];

  // Filter to Intersectoral PiN (the overall figure)
  const intersectoralPiN = needs.filter(n =>
    n.sector_code === 'Intersectoral' &&
    n.population_status === 'INN' &&
    n.category === '' // Empty category = overall, not broken down by age
  );

  // Group by country and year
  const byCountryYear = new Map<string, HapiHumanitarianNeeds>();
  for (const record of intersectoralPiN) {
    const year = record.reference_period_start.substring(0, 4);
    const key = `${record.location_code}_${year}`;
    byCountryYear.set(key, record);
  }

  // Create a simplified view
  const simplified = [...byCountryYear.values()].map(r => ({
    iso3: r.location_code,
    country: r.location_name,
    year: parseInt(r.reference_period_start.substring(0, 4)),
    peopleInNeed: r.population
  }));

  // Sort by year desc, then country
  simplified.sort((a, b) => b.year - a.year || a.country.localeCompare(b.country));

  console.log(`  Intersectoral PiN records: ${simplified.length}`);
  console.log(`  Sample: ${simplified[0]?.country} ${simplified[0]?.year}: ${simplified[0]?.peopleInNeed?.toLocaleString()} people`);

  await writeFile(`${OUTPUT_DIR}/hapi_pin_by_country_year.json`, JSON.stringify(simplified, null, 2));
}

async function createSummary(locations: HapiLocation[], needs: HapiHumanitarianNeeds[]): Promise<void> {
  console.log('\n📊 Creating HAPI summary...');

  const countries = new Set(needs.map(n => n.location_code));
  const sectors = [...new Set(needs.map(n => n.sector_code))].sort();
  const years = [...new Set(needs.map(n => n.reference_period_start.substring(0, 4)))].sort();

  // Calculate totals for intersectoral PiN by year
  const pinByYear: Record<string, number> = {};
  for (const record of needs) {
    if (record.sector_code === 'Intersectoral' &&
        record.population_status === 'INN' &&
        record.category === '') {
      const year = record.reference_period_start.substring(0, 4);
      pinByYear[year] = (pinByYear[year] || 0) + record.population;
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    apiVersion: 'v2',
    appIdentifier: APP_ID,
    statistics: {
      totalLocations: locations.length,
      ghoCountries: locations.filter(l => l.in_gho).length,
      hrpCountries: locations.filter(l => l.has_hrp).length,
      needsRecords: needs.length,
      countriesWithNeeds: countries.size,
      sectors: sectors,
      years: years,
      intersectoralPinByYear: pinByYear
    },
    dataFiles: [
      'hapi_locations.json',
      'hapi_gho_countries.json',
      'hapi_humanitarian_needs.json',
      'hapi_pin_by_country_year.json'
    ]
  };

  await writeFile(`${OUTPUT_DIR}/hapi_summary.json`, JSON.stringify(summary, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  HAPI DOWNLOAD SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  GHO Countries: ${summary.statistics.ghoCountries}`);
  console.log(`  HRP Countries: ${summary.statistics.hrpCountries}`);
  console.log(`  Countries with needs data: ${summary.statistics.countriesWithNeeds}`);
  console.log(`  Total needs records: ${summary.statistics.needsRecords}`);
  console.log(`  Years covered: ${years.join(', ')}`);
  console.log('\n  Intersectoral PiN by Year:');
  for (const [year, total] of Object.entries(pinByYear).sort()) {
    console.log(`    ${year}: ${(total / 1e6).toFixed(1)}M people`);
  }
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  HAPI DATA DOWNLOAD');
  console.log('═══════════════════════════════════════════════════════════');

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Download all data
  const locations = await downloadLocations();
  const needs = await downloadHumanitarianNeeds();
  await downloadIntersectoralPiN();
  await createSummary(locations, needs);

  console.log('✅ HAPI data download complete!');
}

main().catch(console.error);
