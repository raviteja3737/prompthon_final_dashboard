// apply_migration_rest.mjs - Apply Phase 1 migration via Supabase REST API
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://rfzoryifrccrgzdectca.supabase.co';
// We need the service_role key for DDL — use the anon key for RPC
// For running raw SQL we use the /rest/v1/rpc endpoint with a custom SQL runner
// OR we call the Management API
// Since we only have the anon key, we'll use the pg REST endpoint via supabase-js
// Note: DDL (CREATE TABLE, etc.) needs to be run from the Supabase SQL editor or via service_role

// Let's verify connectivity and current state via the anon key
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmem9yeWlmcmNjcmd6ZGVjdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjM0MzUsImV4cCI6MjEwNTk5OTQzNX0.sMBRhvmQqqMK1Y-uWfLqjJ4UpwefZX8VKupQZxXIPu4';

async function checkCurrentTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    }
  });
  console.log('Supabase REST status:', res.status);
  
  // Check which new tables already exist
  const tables = ['platform_admins','events','event_members','rounds','criteria','teams','participants','evaluations','leaderboard_ranks','audit_log'];
  
  console.log('\nChecking table existence via REST API:');
  for (const t of tables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=1`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const status = r.status;
    if (status === 200) console.log(`  ✅ ${t} exists and is accessible`);
    else if (status === 404) console.log(`  ❌ ${t} does NOT exist yet`);
    else if (status === 400) console.log(`  ⚠️  ${t} - check RLS (400: ${await r.text().then(t=>t.substring(0,80))})`);
    else if (status === 401 || status === 403) console.log(`  🔒 ${t} exists but blocked by RLS (expected for anon)`);
    else console.log(`  ❓ ${t} - status ${status}`);
  }
}

checkCurrentTables().catch(console.error);
