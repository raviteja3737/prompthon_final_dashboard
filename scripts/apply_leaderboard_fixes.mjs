import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const databaseUrl = match[1];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Allow organizers to UPDATE their own event (e.g. toggle leaderboard, regenerate token, change status)
DROP POLICY IF EXISTS "organizer_update_own_event" ON public.events;
CREATE POLICY "organizer_update_own_event" ON public.events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.event_id = events.id
              AND em.user_id = auth.uid()
              AND em.role = 'organizer'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.event_id = events.id
              AND em.user_id = auth.uid()
              AND em.role = 'organizer'
        )
    );

-- 2. Metadata RPC for public leaderboard (handles token or slug, reports enabled state cleanly)
CREATE OR REPLACE FUNCTION public.get_public_leaderboard_meta(p_token TEXT)
RETURNS TABLE (
    event_id            UUID,
    event_name          TEXT,
    leaderboard_enabled BOOLEAN,
    status              TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name::TEXT, e.leaderboard_enabled, e.status::TEXT
    FROM public.events e
    WHERE e.public_token = p_token OR e.slug = p_token
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard_meta(TEXT) TO anon, authenticated;

-- 3. Update get_public_leaderboard to support both token and slug
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(p_token TEXT)
RETURNS TABLE (
    event_name TEXT,
    rank       INTEGER,
    team_name  TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_event_id UUID;
    v_enabled  BOOLEAN;
BEGIN
    SELECT e.id, e.leaderboard_enabled
    INTO v_event_id, v_enabled
    FROM public.events e
    WHERE e.public_token = p_token OR e.slug = p_token;

    IF v_event_id IS NULL OR NOT v_enabled THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT ev.name::TEXT, lr.rank, lr.team_name::TEXT
        FROM public.leaderboard_ranks lr
        JOIN public.events ev ON ev.id = lr.event_id
        WHERE lr.event_id = v_event_id
        ORDER BY lr.rank ASC NULLS LAST, lr.team_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(TEXT) TO anon, authenticated;

-- 4. Triggers to refresh leaderboard when teams or rounds change
CREATE OR REPLACE FUNCTION public.trg_refresh_leaderboard_team()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    PERFORM public.refresh_leaderboard(
        CASE TG_OP WHEN 'DELETE' THEN OLD.event_id ELSE NEW.event_id END
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_on_team ON public.teams;
CREATE TRIGGER trg_leaderboard_on_team
    AFTER INSERT OR UPDATE OR DELETE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_leaderboard_team();

DROP TRIGGER IF EXISTS trg_leaderboard_on_round ON public.rounds;
CREATE TRIGGER trg_leaderboard_on_round
    AFTER UPDATE OF status, weight ON public.rounds
    FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_leaderboard_team();

GRANT EXECUTE ON FUNCTION public.refresh_leaderboard(UUID) TO authenticated;
`;

async function run() {
  await client.connect();
  console.log('Connected to DB, applying leaderboard and RLS fixes...');
  await client.query(sql);
  console.log('Fixes applied successfully!');
  await client.end();
}

run().catch(console.error);
