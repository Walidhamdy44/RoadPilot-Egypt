import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config(); // Load .env file

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function resetDatabase() {
  console.log('Dropping all tables...');
  await sql`DROP TABLE IF EXISTS trip_analytics CASCADE`;
  await sql`DROP TABLE IF EXISTS trips CASCADE`;
  await sql`DROP TABLE IF EXISTS sessions CASCADE`;
  await sql`DROP TABLE IF EXISTS accounts CASCADE`;
  await sql`DROP TABLE IF EXISTS verifications CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
  console.log('All tables dropped successfully.');
}

resetDatabase().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
