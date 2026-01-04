/**
 * Donor-related database queries
 */

import { db, schema } from '$lib/server/db';
import { sql, eq } from 'drizzle-orm';

/**
 * Get top donors for a year
 */
export async function getTopDonors(selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(o.name, 'Unknown') as donor,
      COALESCE(o.org_type, 'Unknown') as donor_type,
      SUM(fs.total_amount_usd::numeric) as funding_usd,
      COUNT(DISTINCT fs.recipient_country_id) as countries_funded
    FROM flow_summaries fs
    LEFT JOIN organizations o ON o.id = fs.donor_org_id
    WHERE fs.year = ${selectedYear}
    GROUP BY o.name, o.org_type
    ORDER BY funding_usd DESC
    LIMIT 20
  `);
}

/**
 * Get consolidated country funding (for countries with multiple agencies)
 */
export async function getConsolidatedCountryFunding(selectedYear: number) {
  return db.execute(sql`
    SELECT
      CASE
        WHEN o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%' THEN 'US'
        WHEN o.name LIKE 'Sweden%' OR o.name LIKE 'Swedish%' OR o.name LIKE '%SIDA%' THEN 'Sweden'
        WHEN o.name LIKE 'United Arab Emirates%' OR o.name LIKE 'UAE%' THEN 'UAE'
        WHEN o.name LIKE 'Germany%' OR o.name LIKE 'Deutsche Gesellschaft%' OR o.name LIKE 'KFW%' THEN 'Germany'
        WHEN o.name LIKE 'Italy%' OR o.name LIKE 'Italian%' THEN 'Italy'
        WHEN o.name LIKE 'Switzerland%' OR o.name LIKE 'Swiss%' THEN 'Switzerland'
        WHEN o.name LIKE 'Qatar%' THEN 'Qatar'
      END as country_key,
      SUM(fs.total_amount_usd::numeric) as funding_usd,
      COUNT(DISTINCT fs.recipient_country_id) as countries_funded
    FROM flow_summaries fs
    LEFT JOIN organizations o ON o.id = fs.donor_org_id
    WHERE fs.year = ${selectedYear}
      AND (
        o.name LIKE 'United States%' OR o.name LIKE '%USAID%' OR o.name LIKE '%U.S.%'
        OR o.name LIKE 'Sweden%' OR o.name LIKE 'Swedish%' OR o.name LIKE '%SIDA%'
        OR o.name LIKE 'United Arab Emirates%' OR o.name LIKE 'UAE%'
        OR o.name LIKE 'Germany%' OR o.name LIKE 'Deutsche Gesellschaft%' OR o.name LIKE 'KFW%'
        OR o.name LIKE 'Italy%' OR o.name LIKE 'Italian%'
        OR o.name LIKE 'Switzerland%' OR o.name LIKE 'Swiss%'
        OR o.name LIKE 'Qatar%'
      )
    GROUP BY country_key
  `);
}

/**
 * Get funding by donor type
 */
export async function getDonorTypeData(selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(o.org_type, 'Unknown') as donor_type,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    LEFT JOIN organizations o ON o.id = fs.donor_org_id
    WHERE fs.year = ${selectedYear}
    GROUP BY o.org_type
    ORDER BY funding_usd DESC
  `);
}

/**
 * Get government donors for a year
 */
export async function getGovernmentDonors(selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(o.name, 'Unknown') as donor,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    LEFT JOIN organizations o ON o.id = fs.donor_org_id
    WHERE fs.year = ${selectedYear}
      AND o.org_type = 'Governments'
    GROUP BY o.name
    ORDER BY funding_usd DESC
  `);
}

/**
 * Get donor info by name
 */
export async function getDonorInfo(donorName: string) {
  return db.execute(sql`
    SELECT id, name, org_type
    FROM organizations
    WHERE name = ${donorName}
    LIMIT 1
  `);
}

/**
 * Get donor funding history
 */
export async function getDonorHistory(donorId: number) {
  return db.execute(sql`
    SELECT
      fs.year,
      SUM(fs.total_amount_usd::numeric) as funding_usd,
      COUNT(DISTINCT fs.recipient_country_id) as countries_funded
    FROM flow_summaries fs
    WHERE fs.donor_org_id = ${donorId}
    GROUP BY fs.year
    ORDER BY fs.year ASC
  `);
}

/**
 * Get donor flows to recipient countries
 */
export async function getDonorFlows(donorId: number, selectedYear: number) {
  return db.execute(sql`
    SELECT
      c.name as country,
      c.iso3,
      SUM(fs.total_amount_usd::numeric) as funding_usd,
      SUM(fs.flow_count) as flow_count
    FROM flow_summaries fs
    JOIN countries c ON c.id = fs.recipient_country_id
    WHERE fs.donor_org_id = ${donorId} AND fs.year = ${selectedYear}
    GROUP BY c.name, c.iso3
    ORDER BY funding_usd DESC
  `);
}

/**
 * Get donor sector breakdown
 */
export async function getDonorSectors(donorId: number, selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(s.name, 'Unspecified') as sector,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    LEFT JOIN sectors s ON s.id = fs.sector_id
    WHERE fs.donor_org_id = ${donorId} AND fs.year = ${selectedYear}
    GROUP BY s.name
    ORDER BY funding_usd DESC
  `);
}
