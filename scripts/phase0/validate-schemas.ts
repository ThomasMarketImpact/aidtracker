/**
 * Phase 0: Schema Validation
 * Tests Zod schemas against actual downloaded data
 */

import { readFile } from 'fs/promises';
import {
  FlowsResponseSchema,
  OrganizationsResponseSchema,
  LocationsResponseSchema,
  PlansResponseSchema,
  GlobalClustersResponseSchema,
  FlowSchema
} from './validated-schemas.js';

const DATA_DIR = './scripts/data/raw';

interface ValidationResult {
  schema: string;
  file: string;
  success: boolean;
  totalRecords?: number;
  validRecords?: number;
  errors?: string[];
}

async function validateFile(
  schemaName: string,
  fileName: string,
  schema: any,
  validateRecords = false,
  recordSchema?: any
): Promise<ValidationResult> {
  try {
    const content = await readFile(`${DATA_DIR}/${fileName}`, 'utf-8');
    const data = JSON.parse(content);

    const result = schema.safeParse(data);

    if (!result.success) {
      return {
        schema: schemaName,
        file: fileName,
        success: false,
        errors: result.error.issues.map((i: any) =>
          `${i.path.join('.')}: ${i.message}`
        ).slice(0, 5) // Limit to first 5 errors
      };
    }

    // If validateRecords is true, validate each record individually
    if (validateRecords && recordSchema && data.data?.flows) {
      const flows = data.data.flows;
      let valid = 0;
      const errors: string[] = [];

      for (let i = 0; i < Math.min(flows.length, 100); i++) {
        const flowResult = recordSchema.safeParse(flows[i]);
        if (flowResult.success) {
          valid++;
        } else {
          if (errors.length < 3) {
            errors.push(`Flow ${i}: ${flowResult.error.issues[0]?.message}`);
          }
        }
      }

      return {
        schema: schemaName,
        file: fileName,
        success: errors.length === 0,
        totalRecords: Math.min(flows.length, 100),
        validRecords: valid,
        errors: errors.length > 0 ? errors : undefined
      };
    }

    return {
      schema: schemaName,
      file: fileName,
      success: true,
      totalRecords: data.data?.length || data.data?.flows?.length
    };
  } catch (error) {
    return {
      schema: schemaName,
      file: fileName,
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PHASE 0: SCHEMA VALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: ValidationResult[] = [];

  // Validate each response type
  console.log('Validating Flows response...');
  results.push(await validateFile(
    'FlowsResponseSchema',
    'flows_2024_sample.json',
    FlowsResponseSchema,
    true,
    FlowSchema
  ));

  console.log('Validating Organizations response...');
  results.push(await validateFile(
    'OrganizationsResponseSchema',
    'organizations_sample.json',
    OrganizationsResponseSchema
  ));

  console.log('Validating Locations response...');
  results.push(await validateFile(
    'LocationsResponseSchema',
    'locations.json',
    LocationsResponseSchema
  ));

  console.log('Validating Plans response...');
  results.push(await validateFile(
    'PlansResponseSchema',
    'plans_all.json',
    PlansResponseSchema
  ));

  console.log('Validating Global Clusters response...');
  results.push(await validateFile(
    'GlobalClustersResponseSchema',
    'global_clusters.json',
    GlobalClustersResponseSchema
  ));

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  let allPassed = true;

  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.schema}`);
    console.log(`   File: ${result.file}`);
    if (result.totalRecords !== undefined) {
      console.log(`   Records: ${result.totalRecords}${result.validRecords !== undefined ? ` (${result.validRecords} valid)` : ''}`);
    }
    if (result.errors) {
      allPassed = false;
      console.log('   Errors:');
      for (const err of result.errors) {
        console.log(`     - ${err}`);
      }
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✅ ALL SCHEMAS VALIDATED SUCCESSFULLY');
  } else {
    console.log('  ⚠️  SOME SCHEMAS NEED ADJUSTMENT');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
