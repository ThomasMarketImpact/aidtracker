/**
 * Donor data transformation functions
 */

import { safeNumber, safeYoyChange } from '$lib/utils/numbers';
import {
  isUSGovernment,
  isEUInstitution,
  isEUMember,
  matchesCountryConsolidation,
  CONSOLIDATION_COUNTRIES,
  COUNTRY_CONSOLIDATION_CONFIG,
} from '$lib/constants/donors';
import type { DonorFundingRow, DonorRow, ConsolidatedCountryFundingRow } from '$lib/types/database';

export interface ProcessedGovernmentDonor {
  donor: string;
  funding: number;
  prevFunding: number;
  category: string;
}

export interface AgencyBreakdown {
  donor: string;
  funding: number;
  prevFunding: number;
}

export interface GovernmentDonorsResult {
  topDonors: ProcessedGovernmentDonor[];
  usAgencies: AgencyBreakdown[];
  euMemberStates: AgencyBreakdown[];
}

/**
 * Process and group government donors by category (US, EU, Other)
 */
export function processGovernmentDonors(
  currentYearDonors: unknown[],
  prevYearDonors: unknown[]
): GovernmentDonorsResult {
  // Build previous year lookup
  const prevYearMap = new Map<string, number>();
  (prevYearDonors as DonorFundingRow[]).forEach((r) => {
    const funding = safeNumber(r.funding_usd);
    if (Number.isFinite(funding)) {
      prevYearMap.set(r.donor, funding);
    }
  });

  // Aggregate totals
  let usTotal = 0, usPrevTotal = 0;
  let euMemberTotal = 0, euMemberPrevTotal = 0;
  let euInstitutionTotal = 0, euInstitutionPrevTotal = 0;
  const others: AgencyBreakdown[] = [];

  // Track individual breakdowns
  const usAgencies: AgencyBreakdown[] = [];
  const euMemberStates: AgencyBreakdown[] = [];

  (currentYearDonors as DonorFundingRow[]).forEach((r) => {
    const donor = r.donor;
    if (!donor) return;
    const funding = safeNumber(r.funding_usd);
    if (!Number.isFinite(funding)) return;
    const prevFunding = prevYearMap.get(donor) || 0;

    if (isUSGovernment(donor)) {
      usTotal += funding;
      usPrevTotal += prevFunding;
      usAgencies.push({ donor, funding, prevFunding });
    } else if (isEUInstitution(donor)) {
      euInstitutionTotal += funding;
      euInstitutionPrevTotal += prevFunding;
    } else if (isEUMember(donor)) {
      euMemberTotal += funding;
      euMemberPrevTotal += prevFunding;
      euMemberStates.push({ donor, funding, prevFunding });
    } else {
      others.push({ donor, funding, prevFunding });
    }
  });

  // Build final result
  const result: ProcessedGovernmentDonor[] = [];

  if (usTotal > 0) {
    result.push({ donor: 'United States (All)', funding: usTotal, prevFunding: usPrevTotal, category: 'US' });
  }

  if (euInstitutionTotal > 0) {
    result.push({ donor: 'European Union (Institutions)', funding: euInstitutionTotal, prevFunding: euInstitutionPrevTotal, category: 'EU' });
  }

  if (euMemberTotal > 0) {
    result.push({ donor: 'EU Member States (Combined)', funding: euMemberTotal, prevFunding: euMemberPrevTotal, category: 'EU' });
  }

  others.forEach(o => {
    result.push({ ...o, category: 'Other' });
  });

  // Sort by funding and take top 12
  const topDonors = result.sort((a, b) => b.funding - a.funding).slice(0, 12);

  // Sort breakdowns by funding
  usAgencies.sort((a, b) => b.funding - a.funding);
  euMemberStates.sort((a, b) => b.funding - a.funding);

  return { topDonors, usAgencies, euMemberStates };
}

export interface ConsolidatedDonor {
  donor: string;
  donorType: string;
  funding: number;
  countriesFunded: number;
  isConsolidated?: boolean;
  countryKey?: string;
}

/**
 * Create consolidated donor data (combining multiple agencies per country)
 */
export function createConsolidatedDonorData(
  donorData: unknown[],
  consolidatedCountryFunding: unknown[]
): ConsolidatedDonor[] {
  // Build lookup of consolidated country totals
  const consolidatedTotals = new Map<string, { funding: number; countries: number }>();
  (consolidatedCountryFunding as ConsolidatedCountryFundingRow[]).forEach((r) => {
    if (r.country_key) {
      const funding = safeNumber(r.funding_usd);
      const countries = safeNumber(r.countries_funded);
      if (Number.isFinite(funding) && Number.isFinite(countries)) {
        consolidatedTotals.set(r.country_key, { funding, countries });
      }
    }
  });

  // Filter out donors that belong to any consolidated country
  const nonConsolidatedDonors = (donorData as DonorRow[]).filter((r) => {
    const donor = r.donor;
    if (!donor) return false;
    for (const countryKey of CONSOLIDATION_COUNTRIES) {
      if (matchesCountryConsolidation(donor, countryKey)) {
        return false;
      }
    }
    return true;
  });

  // Create the consolidated list
  const consolidated: ConsolidatedDonor[] = [];

  // Add consolidated entries for each country with funding
  for (const [countryKey, config] of Object.entries(COUNTRY_CONSOLIDATION_CONFIG)) {
    const totals = consolidatedTotals.get(countryKey);
    if (totals && totals.funding > 0 && Number.isFinite(totals.funding)) {
      consolidated.push({
        donor: config.displayName,
        donorType: 'Governments',
        funding: totals.funding,
        countriesFunded: totals.countries,
        isConsolidated: true,
        countryKey,
      });
    }
  }

  // Add non-consolidated donors
  nonConsolidatedDonors.forEach((r) => {
    const funding = safeNumber(r.funding_usd);
    const countriesFunded = safeNumber(r.countries_funded);
    if (!Number.isFinite(funding)) return;
    consolidated.push({
      donor: r.donor,
      donorType: r.donor_type || 'Unknown',
      funding,
      countriesFunded,
      isConsolidated: false,
    });
  });

  // Sort by funding and take top 15
  return consolidated.sort((a, b) => b.funding - a.funding).slice(0, 15);
}

export interface CountryAgencyBreakdown {
  donor: string;
  funding: number;
  prevFunding: number;
  yoyChange: number | null;
}

/**
 * Get breakdown data for each consolidated country
 */
export function getCountryAgenciesBreakdown(
  currentYearDonors: unknown[],
  prevYearDonors: unknown[]
): Record<string, CountryAgencyBreakdown[]> {
  const result: Record<string, CountryAgencyBreakdown[]> = {};

  // Build previous year lookup
  const prevYearMap = new Map<string, number>();
  (prevYearDonors as DonorFundingRow[]).forEach((r) => {
    const funding = safeNumber(r.funding_usd);
    if (r.donor && Number.isFinite(funding)) {
      prevYearMap.set(r.donor, funding);
    }
  });

  for (const countryKey of CONSOLIDATION_COUNTRIES) {
    const agencies: CountryAgencyBreakdown[] = [];

    (currentYearDonors as DonorFundingRow[]).forEach((r) => {
      const donor = r.donor;
      if (matchesCountryConsolidation(donor, countryKey)) {
        const funding = safeNumber(r.funding_usd);
        const prevFunding = prevYearMap.get(donor) || 0;
        const yoyChange = safeYoyChange(funding, prevFunding);
        agencies.push({ donor, funding, prevFunding, yoyChange });
      }
    });

    agencies.sort((a, b) => b.funding - a.funding);
    result[countryKey] = agencies;
  }

  return result;
}
