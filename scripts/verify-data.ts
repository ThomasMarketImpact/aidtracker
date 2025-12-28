/**
 * Verify Data in Database
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DATABASE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Table counts
  const counts = await sql`
    SELECT
      (SELECT COUNT(*) FROM countries) as countries,
      (SELECT COUNT(*) FROM organizations) as organizations,
      (SELECT COUNT(*) FROM sectors) as sectors,
      (SELECT COUNT(*) FROM plans) as plans,
      (SELECT COUNT(*) FROM flow_summaries) as flow_summaries,
      (SELECT COUNT(*) FROM humanitarian_needs) as humanitarian_needs
  `;

  console.log('📊 Table Counts:');
  console.log(`  Countries: ${counts[0].countries}`);
  console.log(`  Organizations: ${counts[0].organizations}`);
  console.log(`  Sectors: ${counts[0].sectors}`);
  console.log(`  Plans: ${counts[0].plans}`);
  console.log(`  Flow Summaries: ${counts[0].flow_summaries}`);
  console.log(`  Humanitarian Needs: ${counts[0].humanitarian_needs}`);

  // Flow totals by year
  console.log('\n💰 Funding by Year:');
  const flowsByYear = await sql`
    SELECT year,
           SUM(total_amount_usd::numeric) as total_usd,
           SUM(flow_count) as raw_flows,
           COUNT(*) as aggregated_records
    FROM flow_summaries
    GROUP BY year
    ORDER BY year DESC
  `;

  for (const row of flowsByYear) {
    const billions = (Number(row.total_usd) / 1e9).toFixed(2);
    console.log(`  ${row.year}: $${billions}B (${row.raw_flows} flows → ${row.aggregated_records} records)`);
  }

  // Top recipient countries 2024
  console.log('\n🌍 Top Recipient Countries (2024):');
  const topCountries = await sql`
    SELECT c.name, c.iso3,
           SUM(fs.total_amount_usd::numeric) as total_usd
    FROM flow_summaries fs
    JOIN countries c ON c.id = fs.recipient_country_id
    WHERE fs.year = 2024
    GROUP BY c.id, c.name, c.iso3
    ORDER BY total_usd DESC
    LIMIT 10
  `;

  for (const row of topCountries) {
    const millions = (Number(row.total_usd) / 1e6).toFixed(1);
    console.log(`  ${row.name} (${row.iso3}): $${millions}M`);
  }

  // Humanitarian needs by year
  console.log('\n👥 People in Need by Year:');
  const needsByYear = await sql`
    SELECT year,
           SUM(people_in_need) as total_pin,
           COUNT(DISTINCT country_id) as countries
    FROM humanitarian_needs
    WHERE sector_id IS NOT NULL
    GROUP BY year
    ORDER BY year DESC
  `;

  for (const row of needsByYear) {
    const millions = (Number(row.total_pin) / 1e6).toFixed(1);
    console.log(`  ${row.year}: ${millions}M people across ${row.countries} country-sectors`);
  }

  // Sample funding vs needs comparison
  console.log('\n📈 Sample: Funding vs Needs (2024, Top 5 Countries):');
  const comparison = await sql`
    WITH funding AS (
      SELECT c.iso3, c.name,
             SUM(fs.total_amount_usd::numeric) as funding_usd
      FROM flow_summaries fs
      JOIN countries c ON c.id = fs.recipient_country_id
      WHERE fs.year = 2024
      GROUP BY c.id, c.iso3, c.name
    ),
    needs AS (
      SELECT c.iso3,
             MAX(hn.people_in_need) as pin
      FROM humanitarian_needs hn
      JOIN countries c ON c.id = hn.country_id
      WHERE hn.year = 2024 OR hn.year = 2025
      GROUP BY c.iso3
    )
    SELECT f.name, f.iso3, f.funding_usd, n.pin
    FROM funding f
    LEFT JOIN needs n ON n.iso3 = f.iso3
    WHERE n.pin IS NOT NULL
    ORDER BY f.funding_usd DESC
    LIMIT 5
  `;

  for (const row of comparison) {
    const fundingM = (Number(row.funding_usd) / 1e6).toFixed(0);
    const pinM = row.pin ? (Number(row.pin) / 1e6).toFixed(1) : 'N/A';
    const perCapita = row.pin ? (Number(row.funding_usd) / Number(row.pin)).toFixed(0) : 'N/A';
    console.log(`  ${row.name}: $${fundingM}M funding, ${pinM}M PiN ($${perCapita}/person)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
