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

async function checkSampleRows() {
  await client.connect();
  const teams = await client.query('SELECT * FROM teams LIMIT 2;');
  console.log('Sample Teams:', teams.rows);

  const juries = await client.query('SELECT * FROM juries LIMIT 2;');
  console.log('Sample Juries:', juries.rows);

  const evaluations = await client.query('SELECT * FROM evaluations LIMIT 2;');
  console.log('Sample Evaluations:', evaluations.rows);

  await client.end();
}

checkSampleRows().catch(console.error);
