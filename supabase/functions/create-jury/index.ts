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
  return pass.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });

    // Must be organizer or admin
    const { eventId, juryName, juryEmail } = await req.json();
    if (!eventId || !juryName || !juryEmail) {
      return new Response(JSON.stringify({ error: 'eventId, juryName, juryEmail required' }), { status: 400, headers: corsHeaders });
    }

    // Check caller is organizer of this event or platform admin
    const { data: adminCheck } = await supabaseAdmin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    const { data: orgCheck }   = await supabaseAdmin.from('event_members').select('role').eq('event_id', eventId).eq('user_id', user.id).eq('role', 'organizer').maybeSingle();
    if (!adminCheck && !orgCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const password = generatePassword(14);

    // Create jury auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: juryEmail,
      password,
      email_confirm: true,
      user_metadata: { name: juryName, role: 'jury' },
    });
    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });

    // Add to event_members
    await supabaseAdmin.from('event_members').insert({
      event_id: eventId,
      user_id: newUser.user!.id,
      role: 'jury',
      display_name: juryName,
      email: juryEmail,
    });

    return new Response(JSON.stringify({
      juryId: newUser.user!.id,
      juryName,
      juryEmail,
      password,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
