/**
 * TypeScript interfaces for database query results
 * These replace `any` type assertions for better type safety
 */

// ═══════════════════════════════════════════════════════════
// FUNDING QUERY RESULTS
// ═══════════════════════════════════════════════════════════

export interface FundingTrendRow {
  year: number;
  total_funding: string | number;
  countries_funded: string | number;
}

export interface CountryFundingByYearRow {
  name: string;
  iso3: string;
  year: number;
  funding: string | number;
}

export interface CountryFundingRow {
  id: number;
  name: string;
  iso3: string;
  funding_usd: string | number;
  flow_count: string | number;
  prev_funding_usd: string | number | null;
  people_in_need: string | number | null;
  funding_per_person: string | number | null;
}

// ═══════════════════════════════════════════════════════════
// DONOR QUERY RESULTS
// ═══════════════════════════════════════════════════════════

export interface DonorRow {
  donor: string;
  donor_type: string | null;
  funding_usd: string | number;
  countries_funded: string | number;
}

export interface DonorFundingRow {
  donor: string;
  funding_usd: string | number;
}

export interface ConsolidatedCountryFundingRow {
  country_key: string | null;
  funding_usd: string | number;
  countries_funded: string | number;
}

export interface DonorTypeRow {
  donor_type: string | null;
  funding_usd: string | number;
}

// ═══════════════════════════════════════════════════════════
// SECTOR QUERY RESULTS
// ═══════════════════════════════════════════════════════════

export interface SectorRow {
  sector: string;
  funding_usd: string | number;
  flow_count?: string | number;
}

// ═══════════════════════════════════════════════════════════
// COUNTRY DETAIL QUERY RESULTS
// ═══════════════════════════════════════════════════════════

export interface CountryHistoryRow {
  year: number;
  funding_usd: string | number;
}

export interface CountryDonorRow {
  donor: string;
  funding_usd: string | number;
}

export interface CountrySectorRow {
  sector: string;
  funding_usd: string | number;
}

// ═══════════════════════════════════════════════════════════
// DONOR DETAIL QUERY RESULTS
// ═══════════════════════════════════════════════════════════

export interface DonorInfoRow {
  id: number;
  name: string;
  org_type: string | null;
}

export interface DonorHistoryRow {
  year: number;
  funding_usd: string | number;
  countries_funded: string | number;
}

export interface DonorFlowRow {
  country: string;
  iso3: string;
  funding_usd: string | number;
  flow_count: string | number;
}

export interface DonorSectorRow {
  sector: string;
  funding_usd: string | number;
}

// ═══════════════════════════════════════════════════════════
// PROCESSED DATA TYPES (after transformation)
// ═══════════════════════════════════════════════════════════

export interface ProcessedCountryData {
  id: number;
  name: string;
  iso3: string;
  funding: number;
  flowCount: number;
  prevFunding: number | null;
  yoyChange: number | null;
  peopleInNeed: number | null;
  fundingPerPerson: number | null;
}

export interface ProcessedDonorData {
  donor: string;
  donorType: string;
  funding: number;
  countriesFunded: number;
  isConsolidated?: boolean;
  countryKey?: string;
}

export interface ProcessedGovernmentDonor {
  donor: string;
  funding: number;
  prevFunding: number;
  category: string;
  yoyChange: number | null;
}

export interface AgencyBreakdown {
  donor: string;
  funding: number;
  prevFunding: number;
  yoyChange: number | null;
}

export interface FundingTrendData {
  year: number;
  funding: number;
  fundingReal2025: number;
  inflationMultiplier: number;
  countries: number;
  peopleInNeed: number | null;
}

export interface CountryFundingSeriesData {
  years: number[];
  countries: Array<{
    name: string;
    iso3: string;
    funding: number[];
  }>;
}

// ═══════════════════════════════════════════════════════════
// COUNTRY/DONOR DETAIL TYPES
// ═══════════════════════════════════════════════════════════

export interface CountryDetail {
  iso3: string;
  name: string;
  currentFunding: number;
  peopleInNeed: number;
  fundingHistory: Array<{ year: number; funding: number }>;
  topDonors: Array<{ donor: string; funding: number }>;
  sectors: Array<{ sector: string; funding: number }>;
}

export interface DonorDetail {
  id: number;
  name: string;
  type: string | null;
  currentFunding: number;
  countriesFunded: number;
  fundingHistory: Array<{ year: number; funding: number; countries: number }>;
  flows: Array<{ country: string; iso3: string; funding: number; flowCount: number }>;
  sectors: Array<{ sector: string; funding: number }>;
}

// ═══════════════════════════════════════════════════════════
// SUMMARY TYPES
// ═══════════════════════════════════════════════════════════

export interface DashboardSummary {
  totalFunding: number;
  totalPeopleInNeed: number;
  countriesWithFunding: number;
  countriesWithNeeds: number;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════

export interface CountryConsolidationConfig {
  displayName: string;
  patterns: string[];
  color: string;
}

export type DonorFilter = 'all' | 'oecd' | 'eu_echo' | 'us' | 'gulf';
