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

async function verifyAll() {
  await client.connect();

  const teamsCount = await client.query('SELECT count(*) as count FROM public.teams');
  console.log('Total teams in public.teams:', teamsCount.rows[0].count);

  const mockCheck = await client.query("SELECT * FROM public.teams WHERE id IN ('team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6') OR name = 'NeuralCrafters'");
  console.log('Mock teams found (should be 0):', mockCheck.rows.length);

  const evalsCount = await client.query('SELECT count(*) as count FROM public.evaluations');
  console.log('Total evaluations (should be 0 mock):', evalsCount.rows[0].count);

  const firstFive = await client.query('SELECT id, name, tag, members FROM public.teams ORDER BY id ASC LIMIT 5');
  console.log('\n--- First 5 Real Teams ---');
  console.table(firstFive.rows);

  const lastFive = await client.query('SELECT id, name, tag, members FROM public.teams ORDER BY id DESC LIMIT 5');
  console.log('\n--- Last 5 Real Teams ---');
  console.table(lastFive.rows);

  const settings = await client.query("SELECT value FROM public.app_settings WHERE key = 'competition_state'");
  console.log('\n--- Competition State Settings ---');
  console.log(settings.rows[0]?.value);

  await client.end();
}

verifyAll().catch(console.error);
