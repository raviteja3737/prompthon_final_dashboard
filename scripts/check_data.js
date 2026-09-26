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

async function checkData() {
  await client.connect();
  const teams = await client.query('SELECT count(*) FROM teams');
  const juries = await client.query('SELECT count(*) FROM juries');
  const evaluations = await client.query('SELECT count(*) FROM evaluations');
  const settings = await client.query('SELECT * FROM app_settings');

  console.log('Teams count:', teams.rows[0].count);
  console.log('Juries count:', juries.rows[0].count);
  console.log('Evaluations count:', evaluations.rows[0].count);
  console.log('App settings:', settings.rows);

  await client.end();
}

checkData().catch(console.error);
