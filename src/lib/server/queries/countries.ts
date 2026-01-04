/**
 * Country-related database queries
 */

import { db, schema } from '$lib/server/db';
import { sql, eq } from 'drizzle-orm';

/**
 * Get list of countries with HRP for filter dropdown
 */
export async function getCountriesList() {
  return db
    .select({ iso3: schema.countries.iso3, name: schema.countries.name })
    .from(schema.countries)
    .where(eq(schema.countries.hasHrp, true))
    .orderBy(schema.countries.name);
}

/**
 * Get country funding history
 */
export async function getCountryHistory(iso3: string) {
  return db.execute(sql`
    SELECT
      fs.year,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    JOIN countries c ON c.id = fs.recipient_country_id
    WHERE c.iso3 = ${iso3}
    GROUP BY fs.year
    ORDER BY fs.year ASC
  `);
}

/**
 * Get top donors for a country
 */
export async function getCountryDonors(iso3: string, selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(o.name, 'Unknown') as donor,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    JOIN countries c ON c.id = fs.recipient_country_id
    LEFT JOIN organizations o ON o.id = fs.donor_org_id
    WHERE c.iso3 = ${iso3} AND fs.year = ${selectedYear}
    GROUP BY o.name
    ORDER BY funding_usd DESC
    LIMIT 10
  `);
}

/**
 * Get sector breakdown for a country
 */
export async function getCountrySectors(iso3: string, selectedYear: number) {
  return db.execute(sql`
    SELECT
      COALESCE(s.name, 'Unspecified') as sector,
      SUM(fs.total_amount_usd::numeric) as funding_usd
    FROM flow_summaries fs
    JOIN countries c ON c.id = fs.recipient_country_id
    LEFT JOIN sectors s ON s.id = fs.sector_id
    WHERE c.iso3 = ${iso3} AND fs.year = ${selectedYear}
    GROUP BY s.name
    ORDER BY funding_usd DESC
  `);
}
