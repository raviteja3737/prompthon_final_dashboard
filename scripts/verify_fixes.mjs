import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rfzoryifrccrgzdectca.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmem9yeWlmcmNjcmd6ZGVjdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjM0MzUsImV4cCI6MjEwNTk5OTQzNX0.sMBRhvmQqqMK1Y-uWfLqjJ4UpwefZX8VKupQZxXIPu4';

const admin = createClient(SUPABASE_URL, ANON_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function test() {
  await admin.auth.signInWithPassword({
    email: 'ravitejaraviteja900@gmail.com',
    password: 'dancewithnivas'
  });

  const slug = 'test-slug-' + Date.now();
  const { data: ev } = await admin.from('events').insert({
    name: 'Auto Refresh Hackathon',
    slug,
    organizer_email: 'ravitejaraviteja900@gmail.com',
    status: 'active',
    leaderboard_enabled: true
  }).select().single();

  console.log('Event created:', ev.id, ev.slug, ev.public_token);

  // 1. Check meta via token
  const { data: metaToken } = await anon.rpc('get_public_leaderboard_meta', { p_token: ev.public_token });
  console.log('Meta via token:', metaToken);

  // 2. Check meta via slug
  const { data: metaSlug } = await anon.rpc('get_public_leaderboard_meta', { p_token: ev.slug });
  console.log('Meta via slug:', metaSlug);

  // 3. Add teams - trigger should run refresh_leaderboard!
  await admin.from('teams').insert([
    { event_id: ev.id, name: 'Team One' },
    { event_id: ev.id, name: 'Team Two' }
  ]);

  // 4. Query public leaderboard via anon
  const { data: lbEntriesToken } = await anon.rpc('get_public_leaderboard', { p_token: ev.public_token });
  console.log('Entries via token:', lbEntriesToken);

  const { data: lbEntriesSlug } = await anon.rpc('get_public_leaderboard', { p_token: ev.slug });
  console.log('Entries via slug:', lbEntriesSlug);

  // 5. Toggle off
  await admin.from('events').update({ leaderboard_enabled: false }).eq('id', ev.id);
  const { data: metaOff } = await anon.rpc('get_public_leaderboard_meta', { p_token: ev.public_token });
  console.log('Meta after toggle off:', metaOff);
  const { data: lbOff } = await anon.rpc('get_public_leaderboard', { p_token: ev.public_token });
  console.log('Entries after toggle off (should be empty):', lbOff);

  // Cleanup
  await admin.from('events').delete().eq('id', ev.id);
  console.log('Cleaned up successfully.');
}

test().catch(console.error);
