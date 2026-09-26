import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const databaseUrl = match[1];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
  await client.connect();
  const res = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);
  console.log('Row security status:');
  console.table(res.rows);

  const pubRes = await client.query(`
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `);
  console.log('\nRealtime published tables:', pubRes.rows.map(r => r.tablename));

  await client.end();
}

checkPolicies().catch(console.error);
