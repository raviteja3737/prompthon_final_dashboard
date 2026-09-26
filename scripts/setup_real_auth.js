import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match[1];

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const SUPABASE_URL = 'https://rfzoryifrccrgzdectca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmem9yeWlmcmNjcmd6ZGVjdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjM0MzUsImV4cCI6MjEwNTk5OTQzNX0.sMBRhvmQqqMK1Y-uWfLqjJ4UpwefZX8VKupQZxXIPu4';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  await client.connect();

  console.log('1. Setting up handle_auto_confirm_user trigger...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
    RETURNS trigger AS $$
    DECLARE
      user_role text;
    BEGIN
      NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
      
      IF LOWER(TRIM(NEW.email)) IN ('ravitejaraviteja900@gmail.com', 'admin@evalpro.org') THEN
        user_role := 'admin';
      ELSE
        user_role := 'jury';
      END IF;

      NEW.raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', user_role
      );
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

    CREATE TRIGGER on_auth_user_created_auto_confirm
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_auto_confirm_user();
  `);
  console.log('Trigger created successfully.');

  // Clean any temporary dummy users
  await client.query("DELETE FROM auth.users WHERE email LIKE 'test_%' OR email LIKE 'auto_confirmed_%';");

  // Get all juries from public.juries
  const juriesRes = await client.query('SELECT email, password, name FROM public.juries');
  const existingJuries = juriesRes.rows;

  await client.end();

  // 2. Register Admins via Supabase Auth
  const adminsToRegister = [
    { email: 'ravitejaraviteja900@gmail.com', password: 'prompthon_final_dashboard', name: 'Super Admin Raviteja' },
    { email: 'admin@evalpro.org', password: 'superadmin123', name: 'Master Super Admin' }
  ];

  for (const adm of adminsToRegister) {
    console.log(`Registering admin ${adm.email}...`);
    const { data, error } = await sb.auth.signUp({
      email: adm.email,
      password: adm.password,
      options: { data: { name: adm.name } }
    });
    if (error && !error.message.includes('already registered')) {
      console.error(`Error registering ${adm.email}:`, error.message);
    } else {
      console.log(`Admin ${adm.email} ready in Supabase Auth.`);
    }
  }

  // 3. Register Juries via Supabase Auth
  for (const j of existingJuries) {
    console.log(`Registering jury ${j.email}...`);
    const { data, error } = await sb.auth.signUp({
      email: j.email,
      password: j.password,
      options: { data: { name: j.name } }
    });
    if (error && !error.message.includes('already registered')) {
      console.error(`Error registering ${j.email}:`, error.message);
    } else {
      console.log(`Jury ${j.email} ready in Supabase Auth.`);
    }
  }

  // 4. Test Logging in as Admin
  console.log('\n--- Testing Admin Login via Supabase Auth ---');
  const adminLogin = await sb.auth.signInWithPassword({
    email: 'ravitejaraviteja900@gmail.com',
    password: 'prompthon_final_dashboard'
  });
  if (adminLogin.error) {
    console.error('Admin login error:', adminLogin.error.message);
  } else {
    console.log('Admin login SUCCESS! JWT issued:');
    console.log('User ID:', adminLogin.data.user.id);
    console.log('Role in app_metadata:', adminLogin.data.user.app_metadata?.role);
    console.log('JWT Token prefix:', adminLogin.data.session.access_token.slice(0, 30) + '...');
  }

  // 5. Test Logging in as Jury
  console.log('\n--- Testing Jury Login via Supabase Auth ---');
  const juryLogin = await sb.auth.signInWithPassword({
    email: 'jury1@evalpro.org',
    password: 'Jury#9412!X'
  });
  if (juryLogin.error) {
    console.error('Jury login error:', juryLogin.error.message);
  } else {
    console.log('Jury login SUCCESS! JWT issued:');
    console.log('User ID:', juryLogin.data.user.id);
    console.log('Role in app_metadata:', juryLogin.data.user.app_metadata?.role);
    console.log('JWT Token prefix:', juryLogin.data.session.access_token.slice(0, 30) + '...');
  }

  console.log('\nAuth setup completed successfully!');
}

main().catch(console.error);
