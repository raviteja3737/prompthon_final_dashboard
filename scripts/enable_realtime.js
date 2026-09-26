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

async function enableRealtime() {
  await client.connect();
  
  try {
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE teams;`);
    console.log('teams added to supabase_realtime');
  } catch (e) {
    console.log('teams realtime:', e.message);
  }

  try {
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE juries;`);
    console.log('juries added to supabase_realtime');
  } catch (e) {
    console.log('juries realtime:', e.message);
  }

  try {
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE evaluations;`);
    console.log('evaluations added to supabase_realtime');
  } catch (e) {
    console.log('evaluations realtime:', e.message);
  }

  try {
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;`);
    console.log('app_settings added to supabase_realtime');
  } catch (e) {
    console.log('app_settings realtime:', e.message);
  }

  // Also enable REPLICA IDENTITY FULL so updates broadcast complete row data
  await client.query(`ALTER TABLE teams REPLICA IDENTITY FULL;`);
  await client.query(`ALTER TABLE juries REPLICA IDENTITY FULL;`);
  await client.query(`ALTER TABLE evaluations REPLICA IDENTITY FULL;`);
  await client.query(`ALTER TABLE app_settings REPLICA IDENTITY FULL;`);
  console.log('Replica identity set to FULL for all tables.');

  await client.end();
}

enableRealtime().catch(console.error);
