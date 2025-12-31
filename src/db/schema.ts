/**
 * Database Schema for FTS Funding vs Needs Dashboard
 * Using Drizzle ORM with Neon PostgreSQL
 */

import { pgTable, serial, varchar, integer, numeric, timestamp, boolean, text, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ═══════════════════════════════════════════════════════════
// REFERENCE TABLES
// ═══════════════════════════════════════════════════════════

export const countries = pgTable('countries', {
  id: serial('id').primaryKey(),
  ftsLocationId: integer('fts_location_id').unique(),
  iso3: varchar('iso3', { length: 3 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  region: varchar('region', { length: 100 }),
  hasHrp: boolean('has_hrp').default(false),
  inGho: boolean('in_gho').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  iso3Idx: index('countries_iso3_idx').on(table.iso3),
}));

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  ftsOrgId: integer('fts_org_id').unique(),
  name: varchar('name', { length: 500 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 255 }),
  orgType: varchar('org_type', { length: 100 }),
  orgSubType: varchar('org_sub_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  ftsOrgIdIdx: index('organizations_fts_org_id_idx').on(table.ftsOrgId),
  nameIdx: index('organizations_name_idx').on(table.name),
}));

export const sectors = pgTable('sectors', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentCode: varchar('parent_code', { length: 20 }),
  isGlobalCluster: boolean('is_global_cluster').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  ftsPlanId: integer('fts_plan_id').unique(),
  name: varchar('name', { length: 500 }).notNull(),
  shortName: varchar('short_name', { length: 100 }),
  year: integer('year').notNull(),
  countryId: integer('country_id').references(() => countries.id),
  planType: varchar('plan_type', { length: 50 }),
  origRequirements: numeric('orig_requirements', { precision: 18, scale: 2 }),
  revisedRequirements: numeric('revised_requirements', { precision: 18, scale: 2 }),
  isReleased: boolean('is_released').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  yearIdx: index('plans_year_idx').on(table.year),
  countryYearIdx: index('plans_country_year_idx').on(table.countryId, table.year),
}));

// ═══════════════════════════════════════════════════════════
// FLOW DATA (AGGREGATED)
// ═══════════════════════════════════════════════════════════

export const flowSummaries = pgTable('flow_summaries', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),

  // Source (donor)
  donorOrgId: integer('donor_org_id').references(() => organizations.id),
  donorCountryId: integer('donor_country_id').references(() => countries.id),

  // Destination (recipient)
  recipientOrgId: integer('recipient_org_id').references(() => organizations.id),
  recipientCountryId: integer('recipient_country_id').references(() => countries.id),

  // Classification
  sectorId: integer('sector_id').references(() => sectors.id),
  planId: integer('plan_id').references(() => plans.id),

  // Amounts (aggregated)
  totalAmountUsd: numeric('total_amount_usd', { precision: 18, scale: 2 }).notNull(),
  flowCount: integer('flow_count').notNull().default(1),
  commitmentAmount: numeric('commitment_amount', { precision: 18, scale: 2 }).default('0'),
  paidAmount: numeric('paid_amount', { precision: 18, scale: 2 }).default('0'),
  pledgeAmount: numeric('pledge_amount', { precision: 18, scale: 2 }).default('0'),

  // Data quality
  dataQuality: varchar('data_quality', { length: 20 }).default('standard'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  yearIdx: index('flow_summaries_year_idx').on(table.year),
  recipientCountryYearIdx: index('flow_summaries_recipient_country_year_idx').on(table.recipientCountryId, table.year),
  donorYearIdx: index('flow_summaries_donor_year_idx').on(table.donorOrgId, table.year),
  sectorYearIdx: index('flow_summaries_sector_year_idx').on(table.sectorId, table.year),
}));

// ═══════════════════════════════════════════════════════════
// HUMANITARIAN NEEDS DATA
// ═══════════════════════════════════════════════════════════

export const humanitarianNeeds = pgTable('humanitarian_needs', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),
  sectorId: integer('sector_id').references(() => sectors.id),

  // Population figures
  peopleInNeed: integer('people_in_need'),
  peopleTargeted: integer('people_targeted'),
  peopleReached: integer('people_reached'),
  totalPopulation: integer('total_population'),

  // Source info
  source: varchar('source', { length: 50 }).default('hapi'),
  dataQuality: varchar('data_quality', { length: 20 }).default('standard'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('humanitarian_needs_country_year_sector_idx').on(table.countryId, table.year, table.sectorId),
  yearIdx: index('humanitarian_needs_year_idx').on(table.year),
}));

// ═══════════════════════════════════════════════════════════
// FUNDING REQUIREMENTS
// ═══════════════════════════════════════════════════════════

export const fundingRequirements = pgTable('funding_requirements', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),
  planId: integer('plan_id').references(() => plans.id),

  requirements: numeric('requirements', { precision: 18, scale: 2 }),
  funding: numeric('funding', { precision: 18, scale: 2 }),
  percentFunded: numeric('percent_funded', { precision: 5, scale: 2 }),

  source: varchar('source', { length: 50 }).default('fts'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('funding_requirements_country_year_idx').on(table.countryId, table.year),
}));

// ═══════════════════════════════════════════════════════════
// REFUGEE POPULATION DATA (from UNHCR)
// ═══════════════════════════════════════════════════════════

export const refugeePopulation = pgTable('refugee_population', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),

  // Population figures (country of asylum)
  refugees: integer('refugees'),              // Refugees in this country
  asylumSeekers: integer('asylum_seekers'),   // Asylum seekers in this country
  idps: integer('idps'),                      // Internally displaced persons
  stateless: integer('stateless'),            // Stateless persons
  returnedRefugees: integer('returned_refugees'), // Refugees who returned
  returnedIdps: integer('returned_idps'),     // IDPs who returned
  otherOfConcern: integer('other_of_concern'), // Other persons of concern

  // Computed totals
  totalRefugeesAndAsylum: integer('total_refugees_and_asylum'), // refugees + asylum_seekers

  // Source info
  source: varchar('source', { length: 50 }).default('unhcr'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('refugee_population_country_year_idx').on(table.countryId, table.year),
  yearIdx: index('refugee_population_year_idx').on(table.year),
}));

// ═══════════════════════════════════════════════════════════
// CHILD WELFARE INDICATORS (from UNICEF)
// ═══════════════════════════════════════════════════════════

export const childWelfareIndicators = pgTable('child_welfare_indicators', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),

  // Child Mortality (CME dataflow)
  under5MortalityRate: numeric('under5_mortality_rate', { precision: 8, scale: 2 }),    // CME_MRY0T4 - per 1,000 live births
  infantMortalityRate: numeric('infant_mortality_rate', { precision: 8, scale: 2 }),    // CME_MRY0 - per 1,000 live births
  neonatalMortalityRate: numeric('neonatal_mortality_rate', { precision: 8, scale: 2 }), // CME_MRY0T27 - per 1,000 live births

  // Nutrition (GLOBAL_DATAFLOW)
  stuntingPrevalence: numeric('stunting_prevalence', { precision: 5, scale: 2 }),       // NT_ANT_HAZ_NE2 - % under 5
  wastingPrevalence: numeric('wasting_prevalence', { precision: 5, scale: 2 }),         // NT_ANT_WHZ_NE2 - % under 5
  severeWastingPrevalence: numeric('severe_wasting_prevalence', { precision: 5, scale: 2 }), // NT_ANT_WHZ_NE3 - % under 5

  // Immunization (IMMUNISATION dataflow)
  dtp3Coverage: numeric('dtp3_coverage', { precision: 5, scale: 2 }),                   // IM_DTP3 - % of surviving infants
  measlesCoverage: numeric('measles_coverage', { precision: 5, scale: 2 }),             // IM_MCV1 - % of surviving infants

  // Demography (DM dataflow)
  populationUnder5: integer('population_under5'),                                        // DM_POP_U5 - thousands
  populationUnder18: integer('population_under18'),                                      // DM_POP_U18 - thousands

  // Education (EDUCATION dataflow)
  primaryAttendanceRate: numeric('primary_attendance_rate', { precision: 5, scale: 2 }), // ED_ANAR_L1 - %
  youthLiteracyRate: numeric('youth_literacy_rate', { precision: 5, scale: 2 }),        // ED_15-24_LR - %

  // Source info
  source: varchar('source', { length: 50 }).default('unicef'),
  dataQuality: varchar('data_quality', { length: 20 }).default('standard'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('child_welfare_country_year_idx').on(table.countryId, table.year),
  yearIdx: index('child_welfare_year_idx').on(table.year),
}));

// ═══════════════════════════════════════════════════════════
// JIAF SEVERITY DATA (from HDX)
// ═══════════════════════════════════════════════════════════

export const jiafSeverity = pgTable('jiaf_severity', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),

  // Administrative breakdown
  admin1Name: varchar('admin1_name', { length: 255 }),
  admin1Pcode: varchar('admin1_pcode', { length: 20 }),
  admin2Name: varchar('admin2_name', { length: 255 }),
  admin2Pcode: varchar('admin2_pcode', { length: 20 }),

  // Population and severity
  population: integer('population'),
  severityLevel: integer('severity_level'),  // 1-5 JIAF scale

  // Sectoral PIN figures
  pinEducation: integer('pin_education'),
  pinShelter: integer('pin_shelter'),
  pinFoodSecurity: integer('pin_food_security'),
  pinHealth: integer('pin_health'),
  pinNutrition: integer('pin_nutrition'),
  pinProtection: integer('pin_protection'),
  pinWash: integer('pin_wash'),
  pinCccm: integer('pin_cccm'),  // Camp Coordination/Management

  // Intersectoral totals
  preliminaryPin: integer('preliminary_pin'),
  finalPin: integer('final_pin'),

  // Source info
  source: varchar('source', { length: 50 }).default('hdx_jiaf'),
  dataQuality: varchar('data_quality', { length: 20 }).default('standard'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: index('jiaf_severity_country_year_idx').on(table.countryId, table.year),
  severityIdx: index('jiaf_severity_level_idx').on(table.severityLevel),
  admin1Idx: index('jiaf_severity_admin1_idx').on(table.admin1Pcode),
  yearIdx: index('jiaf_severity_year_idx').on(table.year),
}));

// Aggregated national-level severity summary (for dashboard)
export const jiafSeveritySummary = pgTable('jiaf_severity_summary', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),

  // Population by severity level (aggregated from admin data)
  populationSeverity1: integer('population_severity_1'),
  populationSeverity2: integer('population_severity_2'),
  populationSeverity3: integer('population_severity_3'),
  populationSeverity4: integer('population_severity_4'),
  populationSeverity5: integer('population_severity_5'),

  // Key metrics
  totalPopulation: integer('total_population'),
  totalPin: integer('total_pin'),
  pinSeverity3Plus: integer('pin_severity_3_plus'),  // People at severity 3, 4, or 5
  pinSeverity4Plus: integer('pin_severity_4_plus'),  // People at severity 4 or 5

  // Admin unit counts by severity
  adminUnitsSeverity3: integer('admin_units_severity_3'),
  adminUnitsSeverity4: integer('admin_units_severity_4'),
  adminUnitsSeverity5: integer('admin_units_severity_5'),

  // Source info
  source: varchar('source', { length: 50 }).default('hdx_jiaf'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('jiaf_severity_summary_country_year_idx').on(table.countryId, table.year),
  yearIdx: index('jiaf_severity_summary_year_idx').on(table.year),
}));

// ═══════════════════════════════════════════════════════════
// IPC FOOD INSECURITY DATA
// ═══════════════════════════════════════════════════════════

export const foodInsecurity = pgTable('food_insecurity', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  year: integer('year').notNull(),
  analysisDate: timestamp('analysis_date'),  // When the IPC analysis was conducted
  analysisPeriod: varchar('analysis_period', { length: 100 }), // e.g., "Oct 2024 - Mar 2025"

  // IPC Phase populations (Acute Food Insecurity)
  phase1: integer('phase1'),           // Minimal
  phase2: integer('phase2'),           // Stressed
  phase3: integer('phase3'),           // Crisis
  phase4: integer('phase4'),           // Emergency
  phase5: integer('phase5'),           // Famine/Catastrophe
  phase3Plus: integer('phase3_plus'),  // Crisis + Emergency + Famine (Phase 3+)

  // Totals
  totalAnalyzed: integer('total_analyzed'),  // Total population analyzed

  // Source info
  source: varchar('source', { length: 50 }).default('ipc'),
  dataQuality: varchar('data_quality', { length: 20 }).default('standard'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  countryYearIdx: uniqueIndex('food_insecurity_country_year_idx').on(table.countryId, table.year),
  yearIdx: index('food_insecurity_year_idx').on(table.year),
}));

// ═══════════════════════════════════════════════════════════
// DATA SYNC TRACKING
// ═══════════════════════════════════════════════════════════

export const dataSyncLog = pgTable('data_sync_log', {
  id: serial('id').primaryKey(),
  syncType: varchar('sync_type', { length: 50 }).notNull(),
  year: integer('year'),
  status: varchar('status', { length: 20 }).notNull(),
  recordsProcessed: integer('records_processed'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
});
