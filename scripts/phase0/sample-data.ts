/**
 * Phase 0: Data Sampling
 * Downloads sample data from FTS API for structure analysis and volume estimation
 */

import { writeFile, mkdir } from 'fs/promises';

const OUTPUT_DIR = './scripts/data/raw';

interface SampleResult {
  endpoint: string;
  recordCount: number;
  sampleRecord: unknown;
  allKeys: string[];
  nestedStructures: Record<string, string[]>;
}

async function fetchJson(url: string): Promise<unknown> {
  console.log(`  Fetching: ${url.substring(0, 80)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function analyzeStructure(data: unknown, prefix = ''): Record<string, string[]> {
  const structures: Record<string, string[]> = {};

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      structures[prefix || 'root'] = Object.keys(data[0]);
      // Analyze nested objects in first record
      for (const [key, value] of Object.entries(data[0])) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          structures[`${prefix}[].${key}[]`] = Object.keys(value[0]);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          structures[`${prefix}[].${key}`] = Object.keys(value);
        }
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    structures[prefix || 'root'] = Object.keys(data);
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        const nested = analyzeStructure(value, `${prefix}.${key}`);
        Object.assign(structures, nested);
      }
    }
  }

  return structures;
}

async function sampleFlows(): Promise<SampleResult> {
  console.log('\n📊 Sampling FTS Flows (2024)...');
  const response = await fetchJson('https://api.hpc.tools/v1/public/fts/flow?year=2024') as {
    status: string;
    data: {
      incoming: { flowCount: number; fundingTotal: number };
      outgoing: { flowCount: number };
      internal: { flowCount: number };
      flows: unknown[];
    };
  };

  // Save full response for analysis
  await writeFile(`${OUTPUT_DIR}/flows_2024_sample.json`, JSON.stringify(response, null, 2));

  const data = response.data;
  return {
    endpoint: '/v1/public/fts/flow?year=2024',
    recordCount: data.incoming?.flowCount || data.flows?.length || 0,
    sampleRecord: data.flows?.[0],
    allKeys: data.flows?.[0] ? Object.keys(data.flows[0]) : [],
    nestedStructures: analyzeStructure(data.flows)
  };
}

async function sampleFlowsGroupedByPlan(): Promise<SampleResult> {
  console.log('\n📊 Sampling FTS Flows grouped by Plan (2024)...');
  const data = await fetchJson('https://api.hpc.tools/v1/public/fts/flow?year=2024&groupby=plan');

  await writeFile(`${OUTPUT_DIR}/flows_2024_grouped_plan.json`, JSON.stringify(data, null, 2));

  return {
    endpoint: '/v1/public/fts/flow?year=2024&groupby=plan',
    recordCount: 0, // Complex structure
    sampleRecord: data,
    allKeys: Object.keys(data as object),
    nestedStructures: analyzeStructure(data)
  };
}

async function sampleOrganizations(): Promise<SampleResult> {
  console.log('\n📊 Sampling Organizations...');
  const data = await fetchJson('https://api.hpc.tools/v1/public/organization') as {
    data: unknown[];
  };

  // Save just first 100 for analysis
  const sample = { ...data, data: data.data?.slice(0, 100) };
  await writeFile(`${OUTPUT_DIR}/organizations_sample.json`, JSON.stringify(sample, null, 2));

  return {
    endpoint: '/v1/public/organization',
    recordCount: data.data?.length || 0,
    sampleRecord: data.data?.[0],
    allKeys: data.data?.[0] ? Object.keys(data.data[0]) : [],
    nestedStructures: analyzeStructure(data.data)
  };
}

async function sampleLocations(): Promise<SampleResult> {
  console.log('\n📊 Sampling Locations...');
  const data = await fetchJson('https://api.hpc.tools/v2/public/location') as {
    data: unknown[];
  };

  await writeFile(`${OUTPUT_DIR}/locations.json`, JSON.stringify(data, null, 2));

  // Also create ISO3 to ID mapping
  const mapping: Record<string, number> = {};
  for (const loc of data.data as Array<{ id: number; iso3: string; name: string }>) {
    if (loc.iso3) {
      mapping[loc.iso3] = loc.id;
    }
  }
  await writeFile(`${OUTPUT_DIR}/location_iso3_to_id.json`, JSON.stringify(mapping, null, 2));

  return {
    endpoint: '/v2/public/location',
    recordCount: data.data?.length || 0,
    sampleRecord: data.data?.[0],
    allKeys: data.data?.[0] ? Object.keys(data.data[0]) : [],
    nestedStructures: analyzeStructure(data.data)
  };
}

async function samplePlans(): Promise<SampleResult> {
  console.log('\n📊 Sampling Plans (all)...');
  const data = await fetchJson('https://api.hpc.tools/v2/public/plan') as {
    data: unknown[];
  };

  await writeFile(`${OUTPUT_DIR}/plans_all.json`, JSON.stringify(data, null, 2));

  return {
    endpoint: '/v2/public/plan',
    recordCount: data.data?.length || 0,
    sampleRecord: data.data?.[0],
    allKeys: data.data?.[0] ? Object.keys(data.data[0]) : [],
    nestedStructures: analyzeStructure(data.data)
  };
}

async function sampleClusters(): Promise<SampleResult> {
  console.log('\n📊 Sampling Global Clusters...');
  const data = await fetchJson('https://api.hpc.tools/v1/public/global-cluster') as {
    data: unknown[];
  };

  await writeFile(`${OUTPUT_DIR}/global_clusters.json`, JSON.stringify(data, null, 2));

  return {
    endpoint: '/v1/public/global-cluster',
    recordCount: data.data?.length || 0,
    sampleRecord: data.data?.[0],
    allKeys: data.data?.[0] ? Object.keys(data.data[0]) : [],
    nestedStructures: analyzeStructure(data.data)
  };
}

async function sampleMultipleYears(): Promise<{ year: number; flowCount: number; fundingTotal: number }[]> {
  console.log('\n📊 Sampling flow counts for multiple years...');
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const counts: { year: number; flowCount: number; fundingTotal: number }[] = [];

  for (const year of years) {
    const response = await fetchJson(`https://api.hpc.tools/v1/public/fts/flow?year=${year}`) as {
      status: string;
      data: {
        incoming: { flowCount: number; fundingTotal: number };
      };
    };
    const flowCount = response.data?.incoming?.flowCount || 0;
    const fundingTotal = response.data?.incoming?.fundingTotal || 0;
    counts.push({ year, flowCount, fundingTotal });
    console.log(`    ${year}: ${flowCount.toLocaleString()} flows, $${(fundingTotal / 1e9).toFixed(1)}B`);
    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  await writeFile(`${OUTPUT_DIR}/flow_counts_by_year.json`, JSON.stringify(counts, null, 2));
  return counts;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PHASE 0: DATA SAMPLING');
  console.log('═══════════════════════════════════════════════════════════');

  await mkdir(OUTPUT_DIR, { recursive: true });

  const results: SampleResult[] = [];

  // Sample each data type
  results.push(await sampleFlows());
  results.push(await sampleOrganizations());
  results.push(await sampleLocations());
  results.push(await samplePlans());
  results.push(await sampleClusters());

  // Get flow counts for volume estimation
  const yearlyFlows = await sampleMultipleYears();

  // Get grouped by plan data (for coordinated vs other)
  results.push(await sampleFlowsGroupedByPlan());

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DATA STRUCTURE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const result of results) {
    console.log(`\n📋 ${result.endpoint}`);
    console.log(`   Records: ${result.recordCount}`);
    console.log(`   Top-level keys: ${result.allKeys.join(', ')}`);
    if (Object.keys(result.nestedStructures).length > 1) {
      console.log('   Nested structures:');
      for (const [path, keys] of Object.entries(result.nestedStructures)) {
        if (path !== 'root' && path !== '') {
          console.log(`     ${path}: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        }
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VOLUME ESTIMATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const totalFlows = yearlyFlows.reduce((sum, y) => sum + y.flowCount, 0);
  const avgFlowsPerYear = Math.round(totalFlows / yearlyFlows.length);

  console.log('Flows by Year:');
  for (const { year, flowCount } of yearlyFlows) {
    console.log(`  ${year}: ${flowCount.toLocaleString()} flows`);
  }
  console.log(`\nTotal flows (${yearlyFlows[0].year}-${yearlyFlows[yearlyFlows.length - 1].year}): ${totalFlows.toLocaleString()}`);
  console.log(`Average per year: ${avgFlowsPerYear.toLocaleString()}`);

  // Calculate Neo4j node estimates
  const orgCount = results.find(r => r.endpoint.includes('organization'))?.recordCount || 0;
  const locationCount = results.find(r => r.endpoint.includes('location'))?.recordCount || 0;
  const planCount = results.find(r => r.endpoint.includes('/plan'))?.recordCount || 0;
  const clusterCount = results.find(r => r.endpoint.includes('cluster'))?.recordCount || 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  NEO4J NODE ESTIMATES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Without aggregation (raw flows):');
  console.log(`  Countries:     ${locationCount}`);
  console.log(`  Organizations: ${orgCount.toLocaleString()}`);
  console.log(`  Plans:         ${planCount}`);
  console.log(`  Clusters:      ${clusterCount}`);
  console.log(`  Flows:         ${totalFlows.toLocaleString()}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  TOTAL:         ${(locationCount + orgCount + planCount + clusterCount + totalFlows).toLocaleString()}`);
  console.log(`  Free tier limit: 200,000`);
  console.log(`  Status: ❌ EXCEEDS LIMIT\n`);

  // Estimate aggregated flows (donor + recipient + country + year + cluster)
  // Rough estimate: unique combinations per year ≈ 3,000-5,000
  const estimatedAggregatedPerYear = 4000;
  const estimatedAggregatedTotal = estimatedAggregatedPerYear * yearlyFlows.length;

  console.log('With aggregation (FlowSummary):');
  console.log(`  Countries:      ${locationCount}`);
  console.log(`  Organizations:  ${orgCount.toLocaleString()}`);
  console.log(`  Plans:          ${planCount}`);
  console.log(`  Clusters:       ${clusterCount}`);
  console.log(`  FlowSummaries:  ~${estimatedAggregatedTotal.toLocaleString()} (estimated)`);
  console.log(`  ─────────────────────────────`);
  const aggregatedTotal = locationCount + orgCount + planCount + clusterCount + estimatedAggregatedTotal;
  console.log(`  TOTAL:          ~${aggregatedTotal.toLocaleString()}`);
  console.log(`  Free tier limit: 200,000`);
  console.log(`  Status: ${aggregatedTotal < 200000 ? '✅ WITHIN LIMIT' : '⚠️ CLOSE TO LIMIT'}`);
  console.log(`  Usage: ${Math.round(aggregatedTotal / 200000 * 100)}%\n`);

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    endpoints: results.map(r => ({
      endpoint: r.endpoint,
      recordCount: r.recordCount,
      keys: r.allKeys
    })),
    flowsByYear: yearlyFlows,
    volumeEstimates: {
      rawNodes: {
        countries: locationCount,
        organizations: orgCount,
        plans: planCount,
        clusters: clusterCount,
        flows: totalFlows,
        total: locationCount + orgCount + planCount + clusterCount + totalFlows
      },
      aggregatedNodes: {
        countries: locationCount,
        organizations: orgCount,
        plans: planCount,
        clusters: clusterCount,
        flowSummaries: estimatedAggregatedTotal,
        total: aggregatedTotal
      },
      freeTierLimit: 200000,
      aggregationRequired: true
    }
  };

  await writeFile(`${OUTPUT_DIR}/sampling_summary.json`, JSON.stringify(summary, null, 2));
  console.log(`📁 Summary saved to: ${OUTPUT_DIR}/sampling_summary.json`);
}

main().catch(console.error);
