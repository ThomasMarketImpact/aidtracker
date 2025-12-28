/**
 * Phase 0: Validated Zod Schemas
 * Based on actual API response analysis from December 2024
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// FTS FLOW SCHEMAS (from /v1/public/fts/flow)
// ═══════════════════════════════════════════════════════════

export const SourceDestObjectSchema = z.object({
  type: z.enum(['Organization', 'Location', 'UsageYear', 'Plan', 'GlobalCluster', 'Cluster', 'Project', 'Emergency']),
  id: z.string(),
  name: z.string(),
  behavior: z.enum(['single', 'shared', 'overlap']).optional(),
  // Organization-specific fields
  organizationTypes: z.array(z.string()).optional(),
  organizationSubTypes: z.array(z.string()).optional(),
  organizationLevels: z.array(z.string()).optional()
});

export const ReportDetailSchema = z.object({
  sourceType: z.string().optional(),
  organization: z.string().optional(),
  reportChannel: z.string().optional(),
  date: z.string().optional()
});

export const FlowSchema = z.object({
  id: z.string(),
  amountUSD: z.number(),
  fullParkedAmountUSD: z.number().optional(),
  budgetYear: z.string().nullable(),
  childFlowIds: z.array(z.number()).nullable().optional(),
  contributionType: z.enum(['financial', 'in-kind']).optional(),
  createdAt: z.string(),
  date: z.string().nullable(),
  decisionDate: z.string().nullable(),
  description: z.string().nullable(),
  grandBargainEarmarkingType: z.array(z.string()).nullable().optional(),
  exchangeRate: z.number().nullable(),
  firstReportedDate: z.string().nullable(),
  flowType: z.enum(['Standard', 'Parked', 'Pass-through', 'Carry-over']).optional(),
  keywords: z.array(z.string()).nullable().optional(),
  newMoney: z.boolean().optional(),
  method: z.string().nullable().optional(),
  parentFlowId: z.number().nullable(),
  status: z.enum(['commitment', 'paid', 'pledge', 'carry-over']),
  updatedAt: z.string(),
  versionId: z.number(),
  sourceObjects: z.array(SourceDestObjectSchema),
  destinationObjects: z.array(SourceDestObjectSchema),
  boundary: z.string().optional(),
  onBoundary: z.union([z.boolean(), z.string()]).optional(),
  reportDetails: z.array(ReportDetailSchema).optional(),
  refCode: z.string().nullable().optional()
});

export const FlowsResponseSchema = z.object({
  status: z.literal('ok'),
  data: z.object({
    incoming: z.object({
      flowCount: z.number(),
      fundingTotal: z.number(),
      pledgeTotal: z.number()
    }),
    outgoing: z.object({
      flowCount: z.number(),
      fundingTotal: z.number(),
      pledgeTotal: z.number()
    }),
    internal: z.object({
      flowCount: z.number()
    }),
    flows: z.array(FlowSchema)
  })
});

// ═══════════════════════════════════════════════════════════
// ORGANIZATION SCHEMAS (from /v1/public/organization)
// ═══════════════════════════════════════════════════════════

export const OrganizationCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  group: z.string()
});

export const OrganizationLocationSchema = z.object({
  id: z.number(),
  adminLevel: z.number(),
  name: z.string(),
  pcode: z.string().nullable(),
  organizationLocation: z.object({
    validOn: z.string().optional()
  }).optional()
});

export const OrganizationSchema = z.object({
  id: z.number(),
  abbreviation: z.string().nullable(),
  name: z.string(),
  categories: z.array(OrganizationCategorySchema),
  locations: z.array(OrganizationLocationSchema)
});

export const OrganizationsResponseSchema = z.object({
  status: z.literal('ok'),
  data: z.array(OrganizationSchema)
});

// ═══════════════════════════════════════════════════════════
// LOCATION SCHEMAS (from /v2/public/location)
// ═══════════════════════════════════════════════════════════

export const LocationSchema = z.object({
  id: z.number(),
  iso3: z.string().nullable(),
  name: z.string(),
  adminLevel: z.number(),
  pcode: z.string().nullable(),
  isRegion: z.boolean().optional()
});

export const LocationsResponseSchema = z.object({
  status: z.literal('ok'),
  data: z.array(LocationSchema)
});

// ═══════════════════════════════════════════════════════════
// PLAN SCHEMAS (from /v2/public/plan)
// ═══════════════════════════════════════════════════════════

export const PlanVersionSchema = z.object({
  id: z.number(),
  planId: z.number(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional()
});

export const PlanCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  parentID: z.number().nullable(),
  code: z.string().nullable()
});

export const PlanLocationSchema = z.object({
  id: z.number(),
  externalId: z.string().nullable(),
  name: z.string(),
  adminLevel: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});

export const PlanYearSchema = z.object({
  id: z.number(),
  year: z.union([z.number(), z.string()]),  // Can be number or string
  createdAt: z.string(),
  updatedAt: z.string(),
  planYear: z.object({}).optional()
});

export const PlanSchema = z.object({
  id: z.number(),
  revisionState: z.string().nullable(),
  isReleased: z.boolean(),
  releasedDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  planVersion: PlanVersionSchema,
  categories: z.array(PlanCategorySchema),
  emergencies: z.array(z.object({
    id: z.number(),
    name: z.string()
  })).optional(),
  locations: z.array(PlanLocationSchema),
  years: z.array(PlanYearSchema),
  origRequirements: z.number().nullable(),
  revisedRequirements: z.number().nullable()
});

export const PlansResponseSchema = z.object({
  status: z.literal('ok'),
  data: z.array(PlanSchema)
});

// ═══════════════════════════════════════════════════════════
// GLOBAL CLUSTER SCHEMAS (from /v1/public/global-cluster)
// ═══════════════════════════════════════════════════════════

export const GlobalClusterSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  type: z.enum(['global', 'aor', 'custom']),
  parentId: z.number().nullable()
});

export const GlobalClustersResponseSchema = z.object({
  status: z.literal('ok'),
  data: z.array(GlobalClusterSchema)
});

// ═══════════════════════════════════════════════════════════
// HDX NEEDS DATA SCHEMAS (from Excel download - legacy)
// ═══════════════════════════════════════════════════════════

export const HdxNeedsRowSchema = z.object({
  Country: z.string(),
  ISO3: z.string().length(3).optional(),
  Year: z.number().min(2010).max(2030),
  'People in Need': z.number().nullable(),
  'People Targeted': z.number().nullable(),
  'Requirements (US$)': z.number().nullable(),
  'Funding (US$)': z.number().nullable(),
  '% Funded': z.number().nullable()
});

// ═══════════════════════════════════════════════════════════
// HAPI SCHEMAS (from HDX HAPI v2 API)
// ═══════════════════════════════════════════════════════════

export const HapiLocationSchema = z.object({
  id: z.number(),
  code: z.string().length(3),
  name: z.string(),
  has_hrp: z.boolean(),
  in_gho: z.boolean(),
  from_cods: z.boolean(),
  reference_period_start: z.string(),
  reference_period_end: z.string().nullable()
});

export const HapiHumanitarianNeedsSchema = z.object({
  location_code: z.string(),
  location_name: z.string(),
  admin1_code: z.string().nullable(),
  admin1_name: z.string().nullable(),
  admin2_code: z.string().nullable(),
  admin2_name: z.string().nullable(),
  admin_level: z.number(),
  resource_hdx_id: z.string(),
  sector_code: z.string(),
  sector_name: z.string(),
  category: z.string(),
  population_status: z.enum(['INN', 'TGT', 'REA', 'all', 'AFF']),
  population: z.number(),
  reference_period_start: z.string(),
  reference_period_end: z.string()
});

export const HapiPinByCountryYearSchema = z.object({
  iso3: z.string().length(3),
  country: z.string(),
  year: z.number(),
  peopleInNeed: z.number()
});

// ═══════════════════════════════════════════════════════════
// AGGREGATED FLOW SUMMARY (for Neo4j)
// ═══════════════════════════════════════════════════════════

export const FlowSummarySchema = z.object({
  id: z.string(), // composite key: donor_recipient_country_year_cluster
  donorId: z.number(),
  donorName: z.string(),
  recipientId: z.number(),
  recipientName: z.string(),
  countryId: z.number(),
  countryISO3: z.string(),
  countryName: z.string(),
  year: z.number(),
  clusterId: z.number().nullable(),
  clusterCode: z.string().nullable(),
  totalAmountUSD: z.number(),
  flowCount: z.number(),
  commitmentAmount: z.number(),
  paidAmount: z.number(),
  pledgeAmount: z.number()
});

// ═══════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════

export type Flow = z.infer<typeof FlowSchema>;
export type FlowsResponse = z.infer<typeof FlowsResponseSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type GlobalCluster = z.infer<typeof GlobalClusterSchema>;
export type HdxNeedsRow = z.infer<typeof HdxNeedsRowSchema>;
export type FlowSummary = z.infer<typeof FlowSummarySchema>;
export type SourceDestObject = z.infer<typeof SourceDestObjectSchema>;
export type HapiLocation = z.infer<typeof HapiLocationSchema>;
export type HapiHumanitarianNeeds = z.infer<typeof HapiHumanitarianNeedsSchema>;
export type HapiPinByCountryYear = z.infer<typeof HapiPinByCountryYearSchema>;

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Extract organization from flow's source/destination objects
 */
export function extractOrganization(objects: SourceDestObject[]): SourceDestObject | undefined {
  return objects.find(o => o.type === 'Organization');
}

/**
 * Extract location from flow's source/destination objects
 */
export function extractLocation(objects: SourceDestObject[]): SourceDestObject | undefined {
  return objects.find(o => o.type === 'Location');
}

/**
 * Extract usage year from flow's source/destination objects
 */
export function extractUsageYear(objects: SourceDestObject[]): number | undefined {
  const yearObj = objects.find(o => o.type === 'UsageYear');
  return yearObj ? parseInt(yearObj.name) : undefined;
}

/**
 * Extract plan from flow's destination objects
 */
export function extractPlan(objects: SourceDestObject[]): SourceDestObject | undefined {
  return objects.find(o => o.type === 'Plan');
}

/**
 * Extract cluster from flow's destination objects
 */
export function extractCluster(objects: SourceDestObject[]): SourceDestObject | undefined {
  return objects.find(o => o.type === 'GlobalCluster');
}

console.log('✅ Schemas exported successfully');
