// apply_migration.mjs - Apply Phase 1 migration to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:Raviteja%4037@db.rfzoryifrccrgzdectca.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!\n');

    const sqlPath = join(__dirname, '../supabase/migrations/001_multi_tenant_schema.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split on semicolons but keep complex statements intact
    // Execute in one transaction block
    console.log('Applying multi-tenant schema migration...');
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration 001_multi_tenant_schema.sql applied successfully!\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('📊 Tables in public schema:');
    result.rows.forEach(r => console.log(' •', r.table_name));

    // Verify functions
    const funcs = await client.query(`
      SELECT proname FROM pg_proc 
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN ('get_public_leaderboard','search_teams_adaptive','refresh_leaderboard','is_platform_admin','is_organizer','is_jury')
      ORDER BY proname;
    `);
    console.log('\n⚙️  Functions created:');
    funcs.rows.forEach(r => console.log(' •', r.proname));

    // Verify RLS
    const rls = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relnamespace = 'public'::regnamespace 
        AND relkind = 'r'
        AND relrowsecurity = true
      ORDER BY relname;
    `);
    console.log('\n🔒 RLS enabled on:');
    rls.rows.forEach(r => console.log(' •', r.relname));

    // Verify indexes
    const idx = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `);
    console.log('\n📈 Indexes created:');
    idx.rows.forEach(r => console.log(' •', r.indexname));

    console.log('\n✅ Phase 1 migration complete!');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
