import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
let databaseUrl = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('Connecting to Supabase Database...');

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected successfully to Supabase PostgreSQL!');

    const sqlPath = path.resolve(__dirname, '../supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing supabase_schema.sql...');
    await client.query(sql);

    console.log('Migration completed successfully! All tables, indexes, constraints, RLS policies, and seed data created.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

runMigration();
