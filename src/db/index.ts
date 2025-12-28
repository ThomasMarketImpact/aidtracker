/**
 * Database Connection for Neon PostgreSQL
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Load environment variables
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon SQL client
const sql = neon(databaseUrl);

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from './schema';

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    console.log('Database connected:', result[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
