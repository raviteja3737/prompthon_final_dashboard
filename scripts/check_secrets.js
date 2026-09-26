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

async function checkSecrets() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT name, secret 
      FROM vault.decrypted_secrets;
    `);
    console.log('Vault secrets:', res.rows);
  } catch (e) {
    console.log('Vault error:', e.message);
  }

  try {
    const configRes = await client.query(`SHOW "app.settings.jwt_secret";`);
    console.log('JWT secret:', configRes.rows);
  } catch (e) {
    console.log('JWT secret query error:', e.message);
  }

  await client.end();
}

checkSecrets().catch(console.error);
