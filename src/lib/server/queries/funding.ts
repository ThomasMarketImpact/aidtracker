/**
 * Funding-related database queries
 */

import { db, schema } from '$lib/server/db';
import { sql, desc, sum } from 'drizzle-orm';
import type { DonorFilter } from '$lib/constants/donors';
import { OECD_DAC_PATTERNS, EU_ECHO_PATTERNS, GULF_PATTERNS } from '$lib/constants/donors';

/**
 * Build SQL condition for donor filter
 * SECURITY: All patterns are hardcoded constants, not user input
 */
export function buildDonorFilterCondition(filter: DonorFilter): string {
  switch (filter) {
    case 'us':
      return `(o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%')`;
    case 'oecd':
      return `(${OECD_DAC_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
    case 'eu_echo':
      return `(${EU_ECHO_PATTERNS.map(p => `o.name LIKE '${p}%'`).join(' OR ')})`;
    case 'gulf':
      return `(${GULF_PATTERNS.map(p => `o.name LIKE '%${p}%'`).join(' OR ')})`;
    default:
      return '1=1';
  }
}

/**
 * Get funding summary by year
 */
export async function getFundingByYear() {
  return db.select({
    year: schema.flowSummaries.year,
    totalUsd: sum(schema.flowSummaries.totalAmountUsd),
    flowCount: sum(schema.flowSummaries.flowCount),
  })
  .from(schema.flowSummaries)
  .groupBy(schema.flowSummaries.year)
  .orderBy(desc(schema.flowSummaries.year));
}

/**
 * Get funding trend data for all years
 */
export async function getFundingTrend() {
  return db.execute(sql`
    SELECT
      fs.year,
      SUM(fs.total_amount_usd::numeric) as total_funding,
      COUNT(DISTINCT fs.recipient_country_id) as countries_funded
    FROM flow_summaries fs
    GROUP BY fs.year
    ORDER BY fs.year ASC
  `);
}

/**
 * Get top 15 countries funding by year (for multi-line chart)
 */
export async function getCountryFundingByYear(donorFilter: DonorFilter) {
  if (donorFilter === 'all') {
    return db.execute(sql`
      WITH top_countries AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as total_funding
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year >= 2016
        GROUP BY c.id, c.name, c.iso3
        ORDER BY total_funding DESC
        LIMIT 15
      )
      SELECT
        tc.name,
        tc.iso3,
        fs.year,
        SUM(fs.total_amount_usd::numeric) as funding
      FROM top_countries tc
      JOIN flow_summaries fs ON fs.recipient_country_id = tc.id
      WHERE fs.year >= 2016
      GROUP BY tc.name, tc.iso3, fs.year
      ORDER BY tc.name, fs.year
    `);
  } else {
    const filterCondition = buildDonorFilterCondition(donorFilter);
    return db.execute(sql.raw(`
      WITH top_countries AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as total_funding
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year >= 2016 AND ${filterCondition}
        GROUP BY c.id, c.name, c.iso3
        ORDER BY total_funding DESC
        LIMIT 15
      )
      SELECT
        tc.name,
        tc.iso3,
        fs.year,
        SUM(fs.total_amount_usd::numeric) as funding
      FROM top_countries tc
      JOIN flow_summaries fs ON fs.recipient_country_id = tc.id
      JOIN organizations o ON o.id = fs.donor_org_id
      WHERE fs.year >= 2016 AND ${filterCondition}
      GROUP BY tc.name, tc.iso3, fs.year
      ORDER BY tc.name, fs.year
    `));
  }
}

/**
 * Get countries data with funding and needs
 */
export async function getCountriesData(selectedYear: number, donorFilter: DonorFilter) {
  if (donorFilter === 'all') {
    return db.execute(sql`
      WITH current_funding AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year = ${selectedYear}
        GROUP BY c.id, c.name, c.iso3
      ),
      prev_funding AS (
        SELECT
          c.id,
          SUM(fs.total_amount_usd::numeric) as prev_funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        WHERE fs.year = ${selectedYear - 1}
        GROUP BY c.id
      ),
      needs AS (
        SELECT
          c.id as country_id,
          MAX(CASE WHEN hn.year = 2025 THEN hn.people_in_need ELSE NULL END) as pin_2025,
          MAX(CASE WHEN hn.year = 2024 THEN hn.people_in_need ELSE NULL END) as pin_2024
        FROM humanitarian_needs hn
        JOIN countries c ON c.id = hn.country_id
        JOIN sectors s ON s.id = hn.sector_id
        WHERE s.code = 'Intersectoral'
        GROUP BY c.id
      )
      SELECT
        cf.id,
        cf.name,
        cf.iso3,
        cf.funding_usd,
        cf.flow_count,
        pf.prev_funding_usd,
        COALESCE(n.pin_2025, n.pin_2024) as people_in_need,
        CASE
          WHEN COALESCE(n.pin_2025, n.pin_2024) > 0
          THEN cf.funding_usd / COALESCE(n.pin_2025, n.pin_2024)
          ELSE NULL
        END as funding_per_person
      FROM current_funding cf
      LEFT JOIN prev_funding pf ON pf.id = cf.id
      LEFT JOIN needs n ON n.country_id = cf.id
      ORDER BY cf.funding_usd DESC
    `);
  } else {
    const filterCondition = buildDonorFilterCondition(donorFilter);
    return db.execute(sql.raw(`
      WITH current_funding AS (
        SELECT
          c.id,
          c.name,
          c.iso3,
          SUM(fs.total_amount_usd::numeric) as funding_usd,
          SUM(fs.flow_count) as flow_count
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year = ${selectedYear}
          AND ${filterCondition}
        GROUP BY c.id, c.name, c.iso3
      ),
      prev_funding AS (
        SELECT
          c.id,
          SUM(fs.total_amount_usd::numeric) as prev_funding_usd
        FROM flow_summaries fs
        JOIN countries c ON c.id = fs.recipient_country_id
        JOIN organizations o ON o.id = fs.donor_org_id
        WHERE fs.year = ${selectedYear - 1}
          AND ${filterCondition}
        GROUP BY c.id
      ),
      needs AS (
        SELECT
          c.id as country_id,
          MAX(CASE WHEN hn.year = 2025 THEN hn.people_in_need ELSE NULL END) as pin_2025,
          MAX(CASE WHEN hn.year = 2024 THEN hn.people_in_need ELSE NULL END) as pin_2024
        FROM humanitarian_needs hn
        JOIN countries c ON c.id = hn.country_id
        JOIN sectors s ON s.id = hn.sector_id
        WHERE s.code = 'Intersectoral'
        GROUP BY c.id
      )
      SELECT
        cf.id,
        cf.name,
        cf.iso3,
        cf.funding_usd,
        cf.flow_count,
        pf.prev_funding_usd,
        COALESCE(n.pin_2025, n.pin_2024) as people_in_need,
        CASE
          WHEN COALESCE(n.pin_2025, n.pin_2024) > 0
          THEN cf.funding_usd / COALESCE(n.pin_2025, n.pin_2024)
          ELSE NULL
        END as funding_per_person
      FROM current_funding cf
      LEFT JOIN prev_funding pf ON pf.id = cf.id
      LEFT JOIN needs n ON n.country_id = cf.id
      ORDER BY cf.funding_usd DESC
    `));
  }
}

/**
 * Get sector breakdown for a year
 */
export async function getSectorData(selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(s.name, 'Unspecified') as sector,
      SUM(fs.total_amount_usd::numeric) as funding_usd,
      SUM(fs.flow_count) as flow_count
    FROM flow_summaries fs
    LEFT JOIN sectors s ON s.id = fs.sector_id
    WHERE fs.year = ${selectedYear}
    GROUP BY s.name
    ORDER BY funding_usd DESC
    LIMIT 15
  `);
}
