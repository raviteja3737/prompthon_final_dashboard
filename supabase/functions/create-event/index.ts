import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(length = 14): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghijkmnpqrstuvwxyz';
  const digits  = '23456789';
  const symbols = '!@#$%&*';
  const all     = upper + lower + digits + symbols;

  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);

  let pass = '';
  pass += upper[buf[0] % upper.length];
  pass += digits[buf[1] % digits.length];
  pass += symbols[buf[2] % symbols.length];
  for (let i = 3; i < length; i++) pass += all[buf[i] % all.length];

  // Shuffle
  return pass.split('').sort(() => Math.random() - 0.5).join('');
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify caller is platform admin via their JWT
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Decode caller identity
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });

    // Check platform_admins
    const { data: admin } = await supabaseAdmin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!admin) return new Response(JSON.stringify({ error: 'Forbidden: Not a platform admin' }), { status: 403, headers: corsHeaders });

    const { eventName, organizerEmail } = await req.json();
    if (!eventName || !organizerEmail) {
      return new Response(JSON.stringify({ error: 'eventName and organizerEmail are required' }), { status: 400, headers: corsHeaders });
    }

    const password = generatePassword(14);
    const slug = slugify(eventName) + '-' + Date.now().toString(36);

    // 1. Create organizer auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: organizerEmail,
      password,
      email_confirm: true,
      user_metadata: { name: organizerEmail.split('@')[0], role: 'organizer' },
    });
    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });

    // 2. Create the event
    const { data: event, error: eventErr } = await supabaseAdmin.from('events').insert({
      name: eventName,
      slug,
      organizer_email: organizerEmail,
      created_by: user.id,
      status: 'draft',
    }).select().single();
    if (eventErr) return new Response(JSON.stringify({ error: eventErr.message }), { status: 400, headers: corsHeaders });

    // 3. Add organizer to event_members
    await supabaseAdmin.from('event_members').insert({
      event_id: event.id,
      user_id: newUser.user!.id,
      role: 'organizer',
      display_name: organizerEmail.split('@')[0],
      email: organizerEmail,
    });

    return new Response(JSON.stringify({
      eventId: event.id,
      slug: event.slug,
      organizerEmail,
      password,  // Shown once — never stored in plaintext in DB
      loginUrl: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co','') ?? ''}e/${slug}/manage`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
