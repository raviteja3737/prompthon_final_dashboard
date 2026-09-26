import psycopg2
from psycopg2.extras import RealDictCursor

import os
import re

def get_db_url():
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            match = re.search(r'DATABASE_URL=["\']?([^"\'\r\n]+)["\']?', f.read())
            if match:
                return match.group(1)
    return os.environ.get('DATABASE_URL', '')

SCHEMA_SQL = """
-- Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    members TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Juries Table
CREATE TABLE IF NOT EXISTS public.juries (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evaluations Table
CREATE TABLE IF NOT EXISTS public.evaluations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    jury_id TEXT NOT NULL REFERENCES public.juries(id) ON DELETE CASCADE,
    jury_email TEXT NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 1),
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    total INTEGER NOT NULL DEFAULT 0,
    remarks TEXT DEFAULT '',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for the hackathon scoring portal (or service role)
-- Drop existing policies if any to avoid errors on rerun
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access teams" ON public.teams;
    DROP POLICY IF EXISTS "Public access juries" ON public.juries;
    DROP POLICY IF EXISTS "Public access evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Public access app_settings" ON public.app_settings;
END $$;

CREATE POLICY "Public access teams" ON public.teams FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access juries" ON public.juries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access evaluations" ON public.evaluations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Ensure anon & authenticated roles have permissions
GRANT ALL ON public.teams TO anon, authenticated, service_role;
GRANT ALL ON public.juries TO anon, authenticated, service_role;
GRANT ALL ON public.evaluations TO anon, authenticated, service_role;
GRANT ALL ON public.app_settings TO anon, authenticated, service_role;

-- Initial Settings Seed
INSERT INTO public.app_settings (key, value)
VALUES ('competition_state', '{"currentActiveRound": 1, "round1Locked": false, "round2Started": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
"""

def setup_schema():
    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor()
    print("Executing schema migration...")
    cur.execute(SCHEMA_SQL)
    conn.commit()
    print("Schema applied successfully!")

    # Check created tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
    tables = cur.fetchall()
    print("Tables in public schema:", [t[0] for t in tables])
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    setup_schema()
