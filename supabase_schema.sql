-- ==============================================================================
-- EVALPRO COMPETITION PORTAL - SUPABASE SQL SCHEMA
-- Run this entire script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    members TEXT NOT NULL,
    tag TEXT DEFAULT 'Batch Registered',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. JURIES TABLE
-- Stores jury evaluator accounts created by Super Admin with auto-generated passwords
CREATE TABLE IF NOT EXISTS public.juries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_plain TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. COMPETITION SETTINGS TABLE (Single-row global competition config)
CREATE TABLE IF NOT EXISTS public.competition_settings (
    id TEXT PRIMARY KEY DEFAULT 'evalpro_global',
    current_active_round INT NOT NULL DEFAULT 1 CHECK (current_active_round IN (1, 2)),
    round_1_locked BOOLEAN NOT NULL DEFAULT false,
    round_2_started BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    jury_id UUID NOT NULL REFERENCES public.juries(id) ON DELETE CASCADE,
    jury_email TEXT NOT NULL,
    round INT NOT NULL CHECK (round IN (1, 2)),
    innovation NUMERIC(4, 1) NOT NULL CHECK (innovation >= 0 AND innovation <= 25),
    tech NUMERIC(4, 1) NOT NULL CHECK (tech >= 0 AND tech <= 25),
    feasibility NUMERIC(4, 1) NOT NULL CHECK (feasibility >= 0 AND feasibility <= 25),
    presentation NUMERIC(4, 1) NOT NULL CHECK (presentation >= 0 AND presentation <= 25),
    total NUMERIC(5, 1) GENERATED ALWAYS AS (innovation + tech + feasibility + presentation) STORED,
    remarks TEXT DEFAULT 'No remarks provided.',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Ensures a jury can submit only 1 score per team per round
    CONSTRAINT unique_team_jury_round UNIQUE (team_id, jury_id, round)
);

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_evaluations_team ON public.evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_jury ON public.evaluations(jury_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_round ON public.evaluations(round);
CREATE INDEX IF NOT EXISTS idx_juries_email ON public.juries(email);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES
-- Drop existing policies if re-running
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view teams" ON public.teams;
    DROP POLICY IF EXISTS "Public can manage teams" ON public.teams;
    DROP POLICY IF EXISTS "Public can view settings" ON public.competition_settings;
    DROP POLICY IF EXISTS "Public can update settings" ON public.competition_settings;
    DROP POLICY IF EXISTS "Public can view evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Public can insert or modify evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Public can view juries" ON public.juries;
    DROP POLICY IF EXISTS "Public can manage juries" ON public.juries;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Public read policies
CREATE POLICY "Public can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public can manage teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can view settings" ON public.competition_settings FOR SELECT USING (true);
CREATE POLICY "Public can update settings" ON public.competition_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can view evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Public can insert or modify evaluations" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can view juries" ON public.juries FOR SELECT USING (true);
CREATE POLICY "Public can manage juries" ON public.juries FOR ALL USING (true) WITH CHECK (true);

-- 9. ENABLE SUPABASE REALTIME REPLICATION
-- Adds tables to the realtime publication for instant live WebSocket broadcasts
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.juries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. INITIAL SEED DATA
-- Insert competition default configuration
INSERT INTO public.competition_settings (id, current_active_round, round_1_locked, round_2_started)
VALUES ('evalpro_global', 1, false, false)
ON CONFLICT (id) DO NOTHING;

-- Insert initial sample teams if table is empty
INSERT INTO public.teams (id, name, members, tag)
VALUES
    ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'NeuralCrafters', 'Aarav Sharma, Priya Patel, Rohan Mehta', 'FinTech AI'),
    ('d290f1ee-6c54-4b01-90e6-d701748f0852', 'QuantumLeap AI', 'Devika Nair, Aditya Verma, Sneha Sen', 'Quantum ML'),
    ('d290f1ee-6c54-4b01-90e6-d701748f0853', 'EcoFlow Dynamics', 'Kavita Joshi, Arjun Deshmukh', 'CleanTech'),
    ('d290f1ee-6c54-4b01-90e6-d701748f0854', 'BioSync Healthcare', 'Tanvi Iyer, Siddharth Roy, Ananya Das', 'HealthTech'),
    ('d290f1ee-6c54-4b01-90e6-d701748f0855', 'CyberAegis Security', 'Varun Grover, Meera Pillai, Yash Kulkarni', 'CyberSec'),
    ('d290f1ee-6c54-4b01-90e6-d701748f0856', 'NovaVision Labs', 'Rajesh Bhatia, Simran Kaur', 'Computer Vision')
ON CONFLICT (id) DO NOTHING;

-- Insert initial sample juries
INSERT INTO public.juries (id, name, email, password_plain)
VALUES
    ('c111f1ee-6c54-4b01-90e6-d701748f0801', 'Jury Panel 01', 'jury1@evalpro.org', 'Jury#9412!X'),
    ('c111f1ee-6c54-4b01-90e6-d701748f0802', 'Jury Panel 02', 'jury2@evalpro.org', 'Jury#8831!K'),
    ('c111f1ee-6c54-4b01-90e6-d701748f0803', 'Jury Panel 03', 'jury3@evalpro.org', 'Jury#7124!M')
ON CONFLICT (id) DO NOTHING;

-- Insert initial evaluations
INSERT INTO public.evaluations (id, team_id, jury_id, jury_email, round, innovation, tech, feasibility, presentation, remarks)
VALUES
    ('e111f1ee-6c54-4b01-90e6-d701748f0901', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'c111f1ee-6c54-4b01-90e6-d701748f0801', 'jury1@evalpro.org', 1, 24, 23, 22, 24, 'Impressive architecture and production readiness.'),
    ('e111f1ee-6c54-4b01-90e6-d701748f0902', 'd290f1ee-6c54-4b01-90e6-d701748f0852', 'c111f1ee-6c54-4b01-90e6-d701748f0801', 'jury1@evalpro.org', 1, 22, 24, 21, 21, 'Superb algorithm, UI requires slightly clearer telemetry.'),
    ('e111f1ee-6c54-4b01-90e6-d701748f0903', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'c111f1ee-6c54-4b01-90e6-d701748f0802', 'jury2@evalpro.org', 1, 23, 22, 24, 23, 'Strong product-market alignment and unit economics.')
ON CONFLICT (id) DO NOTHING;
