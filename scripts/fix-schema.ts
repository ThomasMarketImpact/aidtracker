/**
 * Fix schema - increase abbreviation column length
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('Altering organizations.abbreviation column to varchar(255)...');
  await sql`ALTER TABLE organizations ALTER COLUMN abbreviation TYPE varchar(255)`;
  console.log('Done!');
}

main().catch(console.error);
