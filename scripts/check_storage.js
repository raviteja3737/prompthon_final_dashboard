import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
let databaseUrl = process.env.DATABASE_URL || '';
if (fs.existsSync(envPath)) {
  const match = fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) databaseUrl = match[1];
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Check storage tables
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='storage' ORDER BY table_name");
  console.log('Storage tables present:', tables.rows.map(r => r.table_name));

  // Check buckets
  const buckets = await client.query("SELECT * FROM storage.buckets");
  console.log('Existing buckets:', buckets.rows);

  // Check storage RLS policies
  const policies = await client.query("SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'storage'");
  console.log('Storage policies count:', policies.rows.length);
  console.table(policies.rows);

  // Check storage endpoint via HTTP
  try {
    const res = await fetch('https://rfzoryifrccrgzdectca.supabase.co/storage/v1/bucket', {
      method: 'GET'
    });
    console.log('Storage HTTP endpoint status:', res.status, res.statusText);
    const data = await res.json().catch(() => ({}));
    console.log('Storage HTTP response:', data);
  } catch (err) {
    console.log('Storage HTTP fetch error:', err.message);
  }

  await client.end();
}

main().catch(console.error);
