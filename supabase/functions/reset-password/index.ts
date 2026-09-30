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

    const { targetUserId, eventId } = await req.json();
    if (!targetUserId) return new Response(JSON.stringify({ error: 'targetUserId required' }), { status: 400, headers: corsHeaders });

    // Verify caller has rights
    const { data: adminCheck } = await supabaseAdmin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!adminCheck && eventId) {
      const { data: orgCheck } = await supabaseAdmin.from('event_members').select('role').eq('event_id', eventId).eq('user_id', user.id).eq('role', 'organizer').maybeSingle();
      if (!orgCheck) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const newPassword = generatePassword(14);

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });
    if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: corsHeaders });

    return new Response(JSON.stringify({ password: newPassword }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
