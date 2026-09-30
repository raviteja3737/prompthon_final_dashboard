-- ==============================================================================
-- EVALPRO MULTI-TENANT PLATFORM - MIGRATION 001
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ==============================================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- 1. DROP OLD SINGLE-EVENT TABLES
-- The old schema used TEXT primary keys. The new schema uses UUID.
-- We must drop all old tables CASCADE before recreating them,
-- otherwise CREATE TABLE IF NOT EXISTS silently skips recreation
-- and the TEXT ↔ UUID foreign key mismatch causes the error:
--   "foreign key constraint cannot be implemented: incompatible types uuid and text"
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.audit_log       CASCADE;
DROP TABLE IF EXISTS public.leaderboard_ranks CASCADE;
DROP TABLE IF EXISTS public.evaluations     CASCADE;
DROP TABLE IF EXISTS public.participants    CASCADE;
DROP TABLE IF EXISTS public.criteria        CASCADE;
DROP TABLE IF EXISTS public.rounds          CASCADE;
DROP TABLE IF EXISTS public.teams           CASCADE;
DROP TABLE IF EXISTS public.event_members   CASCADE;
DROP TABLE IF EXISTS public.events          CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.juries          CASCADE;
DROP TABLE IF EXISTS public.app_settings    CASCADE;
DROP TABLE IF EXISTS public.competition_settings CASCADE;

-- ─────────────────────────────────────────────
-- 2. PLATFORM ADMINS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. EVENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    slug                TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
    public_token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
    leaderboard_enabled BOOLEAN NOT NULL DEFAULT false,
    organizer_email     TEXT NOT NULL,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 4. EVENT MEMBERS (organizers + juries)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_members (
    event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('organizer','jury')),
    display_name  TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

-- ─────────────────────────────────────────────
-- 5. ROUNDS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rounds (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    seq      INTEGER NOT NULL DEFAULT 1,
    name     TEXT NOT NULL DEFAULT 'Round 1',
    status   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','locked')),
    weight   NUMERIC NOT NULL DEFAULT 1 CHECK (weight > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, seq)
);

-- ─────────────────────────────────────────────
-- 6. CRITERIA (per round, unlimited, organizer-defined)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.criteria (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id  UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    label     TEXT NOT NULL,
    max_marks NUMERIC NOT NULL DEFAULT 25 CHECK (max_marks > 0),
    seq       INTEGER NOT NULL DEFAULT 1
);

-- ─────────────────────────────────────────────
-- 7. TEAMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    tag        TEXT DEFAULT '',
    extra      JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 8. PARTICIPANTS (members of a team)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.participants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name       TEXT NOT NULL DEFAULT '',
    email      TEXT DEFAULT '',
    phone      TEXT DEFAULT '',
    extra      JSONB DEFAULT '{}'::jsonb
);

-- ─────────────────────────────────────────────
-- 9. EVALUATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    round_id     UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    jury_id      UUID NOT NULL REFERENCES auth.users(id),
    scores       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { criteria_id: mark }
    total        NUMERIC NOT NULL DEFAULT 0,
    remarks      TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (round_id, team_id, jury_id)
);

-- ─────────────────────────────────────────────
-- 10. LEADERBOARD RANKS (materialized by trigger)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard_ranks (
    event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    team_name  TEXT NOT NULL DEFAULT '',
    rank       INTEGER,
    PRIMARY KEY (event_id, team_id)
);

-- ─────────────────────────────────────────────
-- 11. AUDIT LOG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id  UUID REFERENCES public.events(id) ON DELETE SET NULL,
    actor_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action    TEXT NOT NULL,       -- 'edit_mark', 'delete_mark', 'unlock_submission', etc.
    entity    TEXT NOT NULL,       -- table name
    entity_id UUID,
    before    JSONB DEFAULT '{}'::jsonb,
    after     JSONB DEFAULT '{}'::jsonb,
    at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 12. INDEXES
-- ─────────────────────────────────────────────
-- Trigram indexes for full-text adaptive search
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm       ON public.teams USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_participants_name_trgm ON public.participants USING GIN (name gin_trgm_ops);

-- B-tree event_id indexes for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_teams_event            ON public.teams(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event     ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_team      ON public.participants(team_id);
CREATE INDEX IF NOT EXISTS idx_rounds_event           ON public.rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_criteria_round         ON public.criteria(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_event      ON public.evaluations(event_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_round      ON public.evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_team       ON public.evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_jury       ON public.evaluations(jury_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user     ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event        ON public.audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor        ON public.audit_log(actor_id);

-- ─────────────────────────────────────────────
-- 13. HELPER FUNCTIONS (role checks)
-- ─────────────────────────────────────────────

-- Is the current session a platform admin?
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  );
$$;

-- Is the current session an organizer for a given event?
CREATE OR REPLACE FUNCTION public.is_organizer(p_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = p_event_id
      AND user_id  = auth.uid()
      AND role     = 'organizer'
  );
$$;

-- Is the current session a jury member for a given event?
CREATE OR REPLACE FUNCTION public.is_jury(p_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = p_event_id
      AND user_id  = auth.uid()
      AND role     = 'jury'
  );
$$;

-- ─────────────────────────────────────────────
-- 14. SCORE VALIDATION TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_evaluation_scores()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    crit RECORD;
    score_val NUMERIC;
BEGIN
    FOR crit IN
        SELECT c.id, c.max_marks
        FROM public.criteria c
        WHERE c.round_id = NEW.round_id
    LOOP
        score_val := (NEW.scores ->> crit.id::text)::NUMERIC;
        IF score_val IS NOT NULL THEN
            IF score_val < 0 OR score_val > crit.max_marks THEN
                RAISE EXCEPTION 'Score for criterion % must be between 0 and % (got %)',
                    crit.id, crit.max_marks, score_val;
            END IF;
        END IF;
    END LOOP;

    -- Recompute total from scores
    SELECT COALESCE(SUM((NEW.scores ->> c.id::text)::NUMERIC), 0)
    INTO NEW.total
    FROM public.criteria c
    WHERE c.round_id = NEW.round_id
      AND (NEW.scores ->> c.id::text) IS NOT NULL;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_scores ON public.evaluations;
CREATE TRIGGER trg_validate_scores
    BEFORE INSERT OR UPDATE ON public.evaluations
    FOR EACH ROW EXECUTE FUNCTION public.validate_evaluation_scores();

-- ─────────────────────────────────────────────
-- 15. RANKING ENGINE (triggered on evaluation changes)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_leaderboard(p_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    total_weight NUMERIC;
BEGIN
    -- Get total weight for normalization
    SELECT COALESCE(SUM(weight), 1)
    INTO total_weight
    FROM public.rounds
    WHERE event_id = p_event_id
      AND status != 'draft';

    -- Rewrite leaderboard_ranks for this event
    DELETE FROM public.leaderboard_ranks WHERE event_id = p_event_id;

    INSERT INTO public.leaderboard_ranks (event_id, team_id, team_name, rank)
    WITH
    -- Per team, per round: average of jury totals ÷ round max marks → percentage × weight
    round_scores AS (
        SELECT
            e.team_id,
            r.id   AS round_id,
            r.weight,
            AVG(e.total) / NULLIF((
                SELECT SUM(c.max_marks)
                FROM public.criteria c
                WHERE c.round_id = r.id
            ), 0) * 100 AS pct
        FROM public.evaluations e
        JOIN public.rounds r ON r.id = e.round_id
        WHERE e.event_id = p_event_id
          AND r.status != 'draft'
        GROUP BY e.team_id, r.id, r.weight
    ),
    -- Weighted average across rounds
    combined AS (
        SELECT
            team_id,
            SUM(pct * weight) / NULLIF(total_weight, 0) AS combined_score
        FROM round_scores
        GROUP BY team_id
    ),
    -- Standard competition ranking: ties share a rank (1,2,2,4)
    ranked AS (
        SELECT
            t.id                                              AS team_id,
            t.name                                            AS team_name,
            RANK() OVER (ORDER BY c.combined_score DESC NULLS LAST) AS rank
        FROM public.teams t
        LEFT JOIN combined c ON c.team_id = t.id
        WHERE t.event_id = p_event_id
    )
    SELECT p_event_id, team_id, team_name, rank
    FROM ranked;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.trg_refresh_leaderboard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.refresh_leaderboard(
        CASE TG_OP WHEN 'DELETE' THEN OLD.event_id ELSE NEW.event_id END
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_on_eval ON public.evaluations;
CREATE TRIGGER trg_leaderboard_on_eval
    AFTER INSERT OR UPDATE OR DELETE ON public.evaluations
    FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_leaderboard();

DROP TRIGGER IF EXISTS trg_leaderboard_on_team ON public.teams;
CREATE TRIGGER trg_leaderboard_on_team
    AFTER INSERT OR UPDATE OR DELETE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_leaderboard();

DROP TRIGGER IF EXISTS trg_leaderboard_on_round ON public.rounds;
CREATE TRIGGER trg_leaderboard_on_round
    AFTER UPDATE OF status, weight ON public.rounds
    FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_leaderboard();

-- ─────────────────────────────────────────────
-- 16. PUBLIC LEADERBOARD RPCs (anon safe)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 17. ADAPTIVE TEAM SEARCH RPC (trigram + ILIKE)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_teams_adaptive(p_event_id UUID, p_query TEXT)
RETURNS TABLE (
    team_id   UUID,
    team_name TEXT,
    tag       TEXT,
    members   TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name::TEXT,
        t.tag::TEXT,
        STRING_AGG(p.name, ', ' ORDER BY p.name)::TEXT AS members
    FROM public.teams t
    LEFT JOIN public.participants p ON p.team_id = t.id
    WHERE t.event_id = p_event_id
      AND (
        t.name ILIKE '%' || p_query || '%'
        OR similarity(t.name, p_query) > 0.2
        OR EXISTS (
            SELECT 1 FROM public.participants pp
            WHERE pp.team_id = t.id
              AND (pp.name ILIKE '%' || p_query || '%' OR similarity(pp.name, p_query) > 0.2)
        )
      )
    GROUP BY t.id, t.name, t.tag
    ORDER BY similarity(t.name, p_query) DESC, t.name ASC
    LIMIT 50;
END;
$$;

-- ─────────────────────────────────────────────
-- 18. RLS ON ALL TABLES
-- ─────────────────────────────────────────────
ALTER TABLE public.platform_admins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts on re-run
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- ── platform_admins ──
CREATE POLICY "admin_select_platform_admins" ON public.platform_admins
    FOR SELECT USING (is_platform_admin());

-- ── events ──
CREATE POLICY "admin_all_events" ON public.events
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_read_own_event" ON public.events
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.event_id = id AND em.user_id = auth.uid()
    ));

CREATE POLICY "organizer_update_own_event" ON public.events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.event_id = id AND em.user_id = auth.uid() AND em.role = 'organizer'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.event_id = id AND em.user_id = auth.uid() AND em.role = 'organizer'
        )
    );

-- ── event_members ──
CREATE POLICY "admin_all_event_members" ON public.event_members
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_event_members" ON public.event_members
    FOR ALL USING (is_organizer(event_id)) WITH CHECK (is_organizer(event_id));

CREATE POLICY "jury_read_own_membership" ON public.event_members
    FOR SELECT USING (user_id = auth.uid());

-- ── rounds ──
CREATE POLICY "admin_all_rounds" ON public.rounds
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_rounds" ON public.rounds
    FOR ALL USING (is_organizer(event_id)) WITH CHECK (is_organizer(event_id));

CREATE POLICY "jury_read_active_rounds" ON public.rounds
    FOR SELECT USING (is_jury(event_id));

-- ── criteria ──
CREATE POLICY "admin_all_criteria" ON public.criteria
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_criteria" ON public.criteria
    FOR ALL USING (
        is_organizer((SELECT event_id FROM public.rounds WHERE id = round_id))
    ) WITH CHECK (
        is_organizer((SELECT event_id FROM public.rounds WHERE id = round_id))
    );

CREATE POLICY "jury_read_criteria" ON public.criteria
    FOR SELECT USING (
        is_jury((SELECT event_id FROM public.rounds WHERE id = round_id))
    );

-- ── teams ──
CREATE POLICY "admin_all_teams" ON public.teams
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_teams" ON public.teams
    FOR ALL USING (is_organizer(event_id)) WITH CHECK (is_organizer(event_id));

CREATE POLICY "jury_read_event_teams" ON public.teams
    FOR SELECT USING (is_jury(event_id));

-- ── participants ──
CREATE POLICY "admin_all_participants" ON public.participants
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_participants" ON public.participants
    FOR ALL USING (is_organizer(event_id)) WITH CHECK (is_organizer(event_id));

CREATE POLICY "jury_read_event_participants" ON public.participants
    FOR SELECT USING (is_jury(event_id));

-- ── evaluations ──
CREATE POLICY "admin_all_evaluations" ON public.evaluations
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_manage_evaluations" ON public.evaluations
    FOR ALL USING (is_organizer(event_id)) WITH CHECK (is_organizer(event_id));

CREATE POLICY "jury_read_own_evaluations" ON public.evaluations
    FOR SELECT USING (is_jury(event_id) AND jury_id = auth.uid());

CREATE POLICY "jury_submit_evaluation" ON public.evaluations
    FOR INSERT WITH CHECK (
        is_jury(event_id)
        AND jury_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.rounds r
            WHERE r.id = round_id AND r.status = 'active'
        )
    );

CREATE POLICY "jury_update_own_evaluation" ON public.evaluations
    FOR UPDATE USING (
        is_jury(event_id)
        AND jury_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.rounds r
            WHERE r.id = round_id AND r.status = 'active'
        )
    );

-- ── leaderboard_ranks ──
CREATE POLICY "admin_all_leaderboard" ON public.leaderboard_ranks
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_read_leaderboard" ON public.leaderboard_ranks
    FOR SELECT USING (is_organizer(event_id));

CREATE POLICY "jury_read_leaderboard" ON public.leaderboard_ranks
    FOR SELECT USING (is_jury(event_id));

-- NOTE: anon cannot read leaderboard_ranks directly — they use the get_public_leaderboard() RPC

-- ── audit_log ──
CREATE POLICY "admin_all_audit" ON public.audit_log
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "organizer_read_own_audit" ON public.audit_log
    FOR SELECT USING (is_organizer(event_id));

-- ─────────────────────────────────────────────
-- 19. REALTIME PUBLICATIONS (restricted tables only)
-- ─────────────────────────────────────────────
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_ranks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- 20. BOOTSTRAP: Insert super admin (ravitejaraviteja900@gmail.com)
-- Run AFTER creating the auth user in Supabase Auth dashboard
-- ─────────────────────────────────────────────
-- This will be done via the Edge Function on first login detection.
-- The seeder script below is for the test SQL only.

-- NOTE: The super admin user (ravitejaraviteja900@gmail.com / prompthon_final_dashboard)
-- must already exist in auth.users. Run this AFTER creating that account:
/*
INSERT INTO public.platform_admins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'ravitejaraviteja900@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
*/
