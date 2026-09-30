import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const databaseUrl = match[1];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB, running rls_and_ranking_test.sql...');

  client.on('notice', (msg) => {
    console.log(msg.message);
  });

  const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/tests/rls_and_ranking_test.sql'), 'utf8');
  await client.query(sql);
  console.log('rls_and_ranking_test.sql finished successfully!');
  await client.end();
}

run().catch(console.error);
