/**
 * Phase 0: API Endpoint Testing
 * Tests all FTS and HDX API endpoints to verify availability and response structure
 */

interface EndpointTest {
  name: string;
  url: string;
  version: 'v1' | 'v2' | 'hapi';
  expectedStatus: number;
  category: 'flows' | 'reference' | 'plans' | 'needs';
}

const ENDPOINTS_TO_TEST: EndpointTest[] = [
  // ═══════════════════════════════════════════════════════════
  // FTS API v1 ENDPOINTS
  // ═══════════════════════════════════════════════════════════
  {
    name: 'FTS Flows (2024)',
    url: 'https://api.hpc.tools/v1/public/fts/flow?year=2024',
    version: 'v1',
    expectedStatus: 200,
    category: 'flows'
  },
  {
    name: 'FTS Flows with groupby=plan',
    url: 'https://api.hpc.tools/v1/public/fts/flow?year=2024&groupby=plan',
    version: 'v1',
    expectedStatus: 200,
    category: 'flows'
  },
  {
    name: 'FTS Flows by country (Syria)',
    url: 'https://api.hpc.tools/v1/public/fts/flow?year=2024&locationISO3=SYR',
    version: 'v1',
    expectedStatus: 200,
    category: 'flows'
  },
  {
    name: 'FTS Organizations',
    url: 'https://api.hpc.tools/v1/public/organization',
    version: 'v1',
    expectedStatus: 200,
    category: 'reference'
  },
  {
    name: 'FTS Plans by Year (2024)',
    url: 'https://api.hpc.tools/v1/public/plan/year/2024',
    version: 'v1',
    expectedStatus: 200,
    category: 'plans'
  },
  {
    name: 'FTS Global Clusters',
    url: 'https://api.hpc.tools/v1/public/global-cluster',
    version: 'v1',
    expectedStatus: 200,
    category: 'reference'
  },
  // Known broken v1 endpoints
  {
    name: 'FTS Emergency (EXPECTED TO FAIL)',
    url: 'https://api.hpc.tools/v1/public/emergency',
    version: 'v1',
    expectedStatus: 404,
    category: 'reference'
  },

  // ═══════════════════════════════════════════════════════════
  // FTS API v2 ENDPOINTS
  // ═══════════════════════════════════════════════════════════
  {
    name: 'FTS v2 Locations',
    url: 'https://api.hpc.tools/v2/public/location',
    version: 'v2',
    expectedStatus: 200,
    category: 'reference'
  },
  {
    name: 'FTS v2 Plans (all)',
    url: 'https://api.hpc.tools/v2/public/plan',
    version: 'v2',
    expectedStatus: 200,
    category: 'plans'
  },
  {
    name: 'FTS v2 Plan Details (Syria 2024 - ID 1124)',
    url: 'https://api.hpc.tools/v2/public/plan/1124?content=entities',
    version: 'v2',
    expectedStatus: 200,
    category: 'plans'
  },
  // Known broken v2 endpoints
  {
    name: 'FTS v2 Flows (EXPECTED TO FAIL)',
    url: 'https://api.hpc.tools/v2/public/fts/flow?year=2024',
    version: 'v2',
    expectedStatus: 404,
    category: 'flows'
  },

  // ═══════════════════════════════════════════════════════════
  // HDX HAPI ENDPOINTS
  // ═══════════════════════════════════════════════════════════
  {
    name: 'HAPI Humanitarian Needs',
    url: 'https://hapi.humdata.org/api/v1/affected-people/humanitarian-needs?output_format=json&limit=10&app_identifier=test',
    version: 'hapi',
    expectedStatus: 200,
    category: 'needs'
  },
  {
    name: 'HAPI Funding',
    url: 'https://hapi.humdata.org/api/v1/coordination-context/funding?output_format=json&limit=10&app_identifier=test',
    version: 'hapi',
    expectedStatus: 200,
    category: 'needs'
  },
  {
    name: 'HAPI Population',
    url: 'https://hapi.humdata.org/api/v1/population-social/population?output_format=json&limit=10&app_identifier=test',
    version: 'hapi',
    expectedStatus: 200,
    category: 'reference'
  }
];

interface TestResult {
  name: string;
  url: string;
  version: string;
  status: number;
  success: boolean;
  expectedSuccess: boolean;
  responseTime: number;
  recordCount?: number;
  sampleKeys?: string[];
  error?: string;
}

async function testEndpoint(endpoint: EndpointTest): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint.url);
    const responseTime = Date.now() - startTime;

    const result: TestResult = {
      name: endpoint.name,
      url: endpoint.url,
      version: endpoint.version,
      status: response.status,
      success: response.ok,
      expectedSuccess: endpoint.expectedStatus === 200,
      responseTime
    };

    if (response.ok) {
      try {
        const data = await response.json();

        // Extract record count based on response structure
        if (data.data && Array.isArray(data.data)) {
          result.recordCount = data.data.length;
          if (data.data[0]) {
            result.sampleKeys = Object.keys(data.data[0]);
          }
        } else if (data.incoming) {
          result.recordCount = data.incoming.flowCount;
          result.sampleKeys = Object.keys(data);
        } else if (Array.isArray(data)) {
          result.recordCount = data.length;
          if (data[0]) {
            result.sampleKeys = Object.keys(data[0]);
          }
        }
      } catch {
        result.error = 'Failed to parse JSON';
      }
    }

    return result;
  } catch (error) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      version: endpoint.version,
      status: 0,
      success: false,
      expectedSuccess: endpoint.expectedStatus === 200,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PHASE 0: API ENDPOINT TESTING');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: TestResult[] = [];

  for (const endpoint of ENDPOINTS_TO_TEST) {
    process.stdout.write(`Testing: ${endpoint.name}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);

    const statusIcon = result.success ? '✅' : (result.expectedSuccess ? '❌' : '⚠️');
    console.log(`${statusIcon} ${result.status} (${result.responseTime}ms)`);

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success && r.expectedSuccess);
  const expectedFails = results.filter(r => !r.success && !r.expectedSuccess);

  console.log(`✅ Working endpoints: ${working.length}`);
  console.log(`❌ Unexpected failures: ${failed.length}`);
  console.log(`⚠️ Expected failures (confirmed broken): ${expectedFails.length}`);

  console.log('\n--- Working Endpoints ---');
  for (const r of working) {
    console.log(`  [${r.version}] ${r.name}`);
    if (r.recordCount !== undefined) {
      console.log(`       Records: ${r.recordCount}`);
    }
    if (r.sampleKeys) {
      console.log(`       Keys: ${r.sampleKeys.slice(0, 5).join(', ')}${r.sampleKeys.length > 5 ? '...' : ''}`);
    }
  }

  if (failed.length > 0) {
    console.log('\n--- Unexpected Failures ---');
    for (const r of failed) {
      console.log(`  [${r.version}] ${r.name}: ${r.status} ${r.error || ''}`);
    }
  }

  console.log('\n--- Confirmed Broken Endpoints ---');
  for (const r of expectedFails) {
    console.log(`  [${r.version}] ${r.name}: ${r.status}`);
  }

  // Save results to JSON
  const fs = await import('fs/promises');
  const outputPath = './scripts/data/raw/endpoint-test-results.json';
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${outputPath}`);
}

// Run tests
runAllTests().catch(console.error);
