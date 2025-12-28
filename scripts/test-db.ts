/**
 * Test Database Connection
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  console.log('Testing Neon database connection...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  try {
    const sql = neon(databaseUrl);

    // Test basic query
    const result = await sql`SELECT NOW() as time, current_database() as db, version() as version`;
    console.log('Connection successful!');
    console.log('  Database:', result[0].db);
    console.log('  Time:', result[0].time);
    console.log('  Version:', result[0].version.split(',')[0]);

    // Check existing tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('\nExisting tables:', tables.length > 0 ? '' : 'none');
    for (const t of tables) {
      console.log('  -', t.table_name);
    }

  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

main();
