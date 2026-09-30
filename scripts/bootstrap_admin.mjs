// bootstrap_admin.mjs - Registers ravitejaraviteja900@gmail.com as platform super admin
// Run this ONCE after applying the migration to Supabase SQL Editor
// This script uses the Supabase Admin API (Management API) to create the user
// and insert them into platform_admins table

const SUPABASE_URL = 'https://rfzoryifrccrgzdectca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmem9yeWlmcmNjcmd6ZGVjdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjM0MzUsImV4cCI6MjEwNTk5OTQzNX0.sMBRhvmQqqMK1Y-uWfLqjJ4UpwefZX8VKupQZxXIPu4';

const ADMIN_EMAIL = 'ravitejaraviteja900@gmail.com';
const ADMIN_PASSWORD = 'dancewithnivas';

async function bootstrapAdmin() {
  console.log('Testing login with existing super admin credentials...\n');

  // 1. Try to sign in with existing credentials
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const loginData = await loginRes.json();

  if (loginData.access_token) {
    console.log('✅ Super admin login successful!');
    console.log('   User ID:', loginData.user?.id);
    console.log('   Email:', loginData.user?.email);
    console.log('\nNow verify platform_admins table entry...');

    // Check platform_admins
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins?user_id=eq.${loginData.user.id}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${loginData.access_token}`,
      }
    });
    const admins = await checkRes.json();

    if (Array.isArray(admins) && admins.length > 0) {
      console.log('✅ platform_admins entry exists');
      console.log('\n🎉 Bootstrap complete! Super admin is ready.');
    } else {
      console.log('⚠️  platform_admins entry missing. You need to run this SQL in Supabase SQL Editor:');
      console.log(`\nINSERT INTO public.platform_admins (user_id, email)\nVALUES ('${loginData.user.id}', '${ADMIN_EMAIL}')\nON CONFLICT (user_id) DO NOTHING;\n`);
    }
  } else if (loginData.error === 'invalid_grant') {
    console.log('❌ Login failed. The user may not exist in Supabase Auth yet.');
    console.log('\nTo create the super admin account, run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log(`-- Step 1: Apply the migration SQL (supabase/migrations/001_multi_tenant_schema.sql)`);
    console.log(`-- Step 2: Create the super admin user in Supabase Auth dashboard`);
    console.log(`--   Authentication → Users → Add user`);
    console.log(`--   Email: ${ADMIN_EMAIL}`);
    console.log(`--   Password: ${ADMIN_PASSWORD}`);
    console.log(`\n-- Step 3: Run this SQL to grant admin role:`);
    console.log(`INSERT INTO public.platform_admins (user_id, email)`);
    console.log(`SELECT id, email FROM auth.users WHERE email = '${ADMIN_EMAIL}'`);
    console.log(`ON CONFLICT (user_id) DO NOTHING;\n`);
  } else {
    console.log('Response:', loginData);
  }
}

bootstrapAdmin().catch(console.error);
