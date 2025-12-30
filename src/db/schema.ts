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
