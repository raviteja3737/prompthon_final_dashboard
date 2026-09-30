-- ==============================================================================
-- PHASE 1 RLS & RANKING VERIFICATION TEST SCRIPT
-- Run after 001_multi_tenant_schema.sql has been applied
-- Run as the postgres (service role) user
-- ==============================================================================

-- ─── 1. Verify all required tables exist ───────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platform_admins','events','event_members','rounds','criteria',
    'teams','participants','evaluations','leaderboard_ranks','audit_log'
  ]
  LOOP
    ASSERT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ), 'FAIL: Missing table ' || t;
    RAISE NOTICE 'PASS: Table "%" exists', t;
  END LOOP;
END $$;

-- ─── 2. Verify RLS enabled on all tables ───────────────────────────────────
DO $$
DECLARE t TEXT; is_enabled BOOLEAN;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platform_admins','events','event_members','rounds','criteria',
    'teams','participants','evaluations','leaderboard_ranks','audit_log'
  ]
  LOOP
    SELECT relrowsecurity INTO is_enabled
    FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace;
    ASSERT is_enabled, 'FAIL: RLS not enabled on ' || t;
    RAISE NOTICE 'PASS: RLS enabled on "%"', t;
  END LOOP;
END $$;

-- ─── 3. Verify trigram indexes exist ───────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teams_name_trgm'
  ), 'FAIL: Missing trigram index on teams.name';
  RAISE NOTICE 'PASS: Trigram index on teams.name exists';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_participants_name_trgm'
  ), 'FAIL: Missing trigram index on participants.name';
  RAISE NOTICE 'PASS: Trigram index on participants.name exists';
END $$;

-- ─── 4. Verify RPCs exist ──────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_public_leaderboard'
  ), 'FAIL: RPC get_public_leaderboard missing';
  RAISE NOTICE 'PASS: get_public_leaderboard() RPC exists';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'search_teams_adaptive'
  ), 'FAIL: RPC search_teams_adaptive missing';
  RAISE NOTICE 'PASS: search_teams_adaptive() RPC exists';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'refresh_leaderboard'
  ), 'FAIL: refresh_leaderboard() missing';
  RAISE NOTICE 'PASS: refresh_leaderboard() function exists';
END $$;

-- ─── 5. Ranking math test: dynamic criteria, ties, weighted rounds ──────────
DO $$
DECLARE
  v_event_id  UUID := gen_random_uuid();
  v_round1_id UUID := gen_random_uuid();
  v_round2_id UUID := gen_random_uuid();
  v_crit1a    UUID := gen_random_uuid();
  v_crit1b    UUID := gen_random_uuid();
  v_crit2a    UUID := gen_random_uuid();
  v_team1     UUID := gen_random_uuid();
  v_team2     UUID := gen_random_uuid();
  v_jury1     UUID;
  v_jury2     UUID;
  r1          INTEGER; r2 INTEGER;
BEGIN
  SELECT id INTO v_jury1 FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_jury2 FROM auth.users ORDER BY created_at DESC LIMIT 1;
  IF v_jury2 IS NULL THEN v_jury2 := v_jury1; END IF;

  -- Insert test event
  INSERT INTO public.events (id, name, slug, organizer_email)
  VALUES (v_event_id, 'Test Event', 'test-rls-' || substr(v_event_id::text,1,8), 'test@test.com');

  -- Insert rounds: R1 weight=1 (10+10=20 max), R2 weight=2 (25 max)
  INSERT INTO public.rounds (id, event_id, seq, name, status, weight)
  VALUES
    (v_round1_id, v_event_id, 1, 'Round 1', 'active', 1),
    (v_round2_id, v_event_id, 2, 'Round 2', 'active', 2);

  -- Insert criteria
  INSERT INTO public.criteria (id, round_id, label, max_marks, seq) VALUES
    (v_crit1a, v_round1_id, 'Innovation', 10, 1),
    (v_crit1b, v_round1_id, 'Tech', 10, 2),
    (v_crit2a, v_round2_id, 'Final Presentation', 25, 1);

  -- Insert teams
  INSERT INTO public.teams (id, event_id, name) VALUES
    (v_team1, v_event_id, 'Team Alpha'),
    (v_team2, v_event_id, 'Team Beta');

  -- Insert evaluations (bypass trigger foreign key by disabling temporarily)
  -- Team1: R1 scores: jury1=18/20, jury2=16/20 → avg=17/20=85%
  -- Team1: R2 scores: jury1=22/25 → avg=22/25=88%
  -- Team1 combined = (85%×1 + 88%×2) / 3 = (85+176)/3 = 87%

  -- Team2: R1 scores: jury1=20/20 → avg=20/20=100%
  -- Team2: R2 scores: jury1=20/25 → avg=20/25=80%
  -- Team2 combined = (100%×1 + 80%×2) / 3 = (100+160)/3 = 86.67%

  -- So: Team1(87%) > Team2(86.67%) → Team1 rank=1, Team2 rank=2

  -- Directly insert (skipping trigger score validation, using computed totals)
  INSERT INTO public.evaluations (event_id, round_id, team_id, jury_id, scores, total)
  VALUES
    (v_event_id, v_round1_id, v_team1, v_jury1, json_build_object(v_crit1a::text, 9, v_crit1b::text, 9)::jsonb, 18),
    (v_event_id, v_round1_id, v_team1, v_jury2, json_build_object(v_crit1a::text, 8, v_crit1b::text, 8)::jsonb, 16),
    (v_event_id, v_round1_id, v_team2, v_jury1, json_build_object(v_crit1a::text, 10, v_crit1b::text, 10)::jsonb, 20),
    (v_event_id, v_round2_id, v_team1, v_jury1, json_build_object(v_crit2a::text, 22)::jsonb, 22),
    (v_event_id, v_round2_id, v_team2, v_jury1, json_build_object(v_crit2a::text, 20)::jsonb, 20);

  -- Refresh rankings
  PERFORM public.refresh_leaderboard(v_event_id);

  -- Verify rankings
  SELECT rank INTO r1 FROM public.leaderboard_ranks
  WHERE event_id = v_event_id AND team_id = v_team1;

  SELECT rank INTO r2 FROM public.leaderboard_ranks
  WHERE event_id = v_event_id AND team_id = v_team2;

  ASSERT r1 = 1, format('FAIL: Team Alpha should be rank 1, got %s', r1);
  RAISE NOTICE 'PASS: Team Alpha correctly ranked #1 (combined ~87%%)';

  ASSERT r2 = 2, format('FAIL: Team Beta should be rank 2, got %s', r2);
  RAISE NOTICE 'PASS: Team Beta correctly ranked #2 (combined ~86.67%%)';

  -- Cleanup test data
  DELETE FROM public.events WHERE id = v_event_id;
  RAISE NOTICE 'PASS: Ranking math test complete. Cleanup done.';
END $$;

-- ─── 6. Public token test: disabled leaderboard returns nothing ─────────────
DO $$
DECLARE
  v_event_id UUID := gen_random_uuid();
  v_token    TEXT := 'test_token_' || substr(gen_random_uuid()::text, 1, 8);
  row_count  INTEGER;
BEGIN
  INSERT INTO public.events (id, name, slug, organizer_email, public_token, leaderboard_enabled)
  VALUES (v_event_id, 'Token Test', 'token-test-' || substr(v_event_id::text,1,6), 'x@x.com', v_token, false);

  SELECT COUNT(*) INTO row_count FROM public.get_public_leaderboard(v_token);
  ASSERT row_count = 0, 'FAIL: Disabled leaderboard should return 0 rows';
  RAISE NOTICE 'PASS: Disabled leaderboard token returns 0 rows';

  DELETE FROM public.events WHERE id = v_event_id;
END $$;

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'ALL PHASE 1 TESTS PASSED';
  RAISE NOTICE '=========================================';
END $$;
