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

async function seed() {
  await client.connect();
  console.log('Connected to DB...');

  // Get admin/organizer user ID
  const adminRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'ravitejaraviteja900@gmail.com'");
  if (adminRes.rows.length === 0) {
    console.error('Super admin user not found');
    await client.end();
    return;
  }
  const adminId = adminRes.rows[0].id;
  const adminEmail = adminRes.rows[0].email;

  // Check if demo event already exists
  const existingEv = await client.query("SELECT id FROM public.events WHERE slug = 'ai-agents-2026'");
  if (existingEv.rows.length > 0) {
    console.log('Cleaning up old demo event...');
    await client.query("DELETE FROM public.events WHERE slug = 'ai-agents-2026'");
  }

  // 1. Create Event
  const evRes = await client.query(`
    INSERT INTO public.events (name, slug, organizer_email, created_by, status, leaderboard_enabled, public_token)
    VALUES ('Promptothon Hackathon 2026', 'ai-agents-2026', $1, $2, 'active', true, 'demo-token-2026')
    RETURNING *;
  `, [adminEmail, adminId]);
  const event = evRes.rows[0];
  console.log('✅ Created Event:', event.name, event.slug, event.public_token);

  // 2. Add organizer member
  await client.query(`
    INSERT INTO public.event_members (event_id, user_id, role, display_name, email)
    VALUES ($1, $2, 'organizer', 'Lead Organizer', $3)
    ON CONFLICT (event_id, user_id) DO NOTHING;
  `, [event.id, adminId, adminEmail]);

  // 3. Create Rounds
  const r1Res = await client.query(`
    INSERT INTO public.rounds (event_id, seq, name, status, weight)
    VALUES ($1, 1, 'Preliminary Pitch', 'active', 40)
    RETURNING *;
  `, [event.id]);
  const round1 = r1Res.rows[0];

  const r2Res = await client.query(`
    INSERT INTO public.rounds (event_id, seq, name, status, weight)
    VALUES ($1, 2, 'Technical Demo & Code Review', 'active', 60)
    RETURNING *;
  `, [event.id]);
  const round2 = r2Res.rows[0];
  console.log('✅ Created Rounds: Round 1 & Round 2');

  // 4. Create Criteria
  const c1a = (await client.query(`INSERT INTO public.criteria (round_id, seq, label, max_marks) VALUES ($1, 1, 'Problem Statement & Impact', 25) RETURNING id;`, [round1.id])).rows[0].id;
  const c1b = (await client.query(`INSERT INTO public.criteria (round_id, seq, label, max_marks) VALUES ($1, 2, 'Clarity & Pitch Quality', 25) RETURNING id;`, [round1.id])).rows[0].id;

  const c2a = (await client.query(`INSERT INTO public.criteria (round_id, seq, label, max_marks) VALUES ($1, 1, 'Architecture & Code Quality', 50) RETURNING id;`, [round2.id])).rows[0].id;
  const c2b = (await client.query(`INSERT INTO public.criteria (round_id, seq, label, max_marks) VALUES ($1, 2, 'Innovation & AI Depth', 50) RETURNING id;`, [round2.id])).rows[0].id;
  console.log('✅ Created Criteria for both rounds');

  // 5. Create Teams
  const teamsData = [
    { name: 'Neural Crafters', tag: 'AI / LLM', members: 'Alex Rivers, Sarah Chen' },
    { name: 'Quantum Leap', tag: 'Web3 / Infra', members: 'Marcus Vance, Priya Patel' },
    { name: 'CyberSentinels', tag: 'Cybersecurity', members: 'David Kim, Elena Rostova' },
    { name: 'OmniVibe Studio', tag: 'Creative Tech', members: 'Leo Torres, Jordan Bell' },
    { name: 'Synapse Core', tag: 'HealthTech', members: 'Ananya Roy, Nina Gupta' },
    { name: 'Velocity Agents', tag: 'Autonomous AI', members: 'Vikram Seth, Liam O Connor' },
  ];

  const teamIds = [];
  for (const t of teamsData) {
    const tRes = await client.query(`
      INSERT INTO public.teams (event_id, name, tag)
      VALUES ($1, $2, $3)
      RETURNING id, name;
    `, [event.id, t.name, t.tag]);
    const team = tRes.rows[0];
    teamIds.push(team);

    // Add participants
    const members = t.members.split(', ');
    for (const m of members) {
      await client.query(`
        INSERT INTO public.participants (event_id, team_id, name, email)
        VALUES ($1, $2, $3, $4);
      `, [event.id, team.id, m, `${m.toLowerCase().replace(/ /g, '.')}@example.com`]);
    }
  }
  console.log('✅ Created 6 Teams and Participants');

  // 6. Insert evaluations for some teams
  const evals = [
    // Neural Crafters: R1 (24+23 = 47/50), R2 (48+49 = 97/100) -> Highest
    { teamId: teamIds[0].id, roundId: round1.id, scores: { [c1a]: 24, [c1b]: 23 }, total: 47 },
    { teamId: teamIds[0].id, roundId: round2.id, scores: { [c2a]: 48, [c2b]: 49 }, total: 97 },

    // Velocity Agents: R1 (22+24 = 46/50), R2 (47+46 = 93/100) -> 2nd
    { teamId: teamIds[5].id, roundId: round1.id, scores: { [c1a]: 22, [c1b]: 24 }, total: 46 },
    { teamId: teamIds[5].id, roundId: round2.id, scores: { [c2a]: 47, [c2b]: 46 }, total: 93 },

    // Quantum Leap: R1 (21+20 = 41/50), R2 (42+45 = 87/100) -> 3rd
    { teamId: teamIds[1].id, roundId: round1.id, scores: { [c1a]: 21, [c1b]: 20 }, total: 41 },
    { teamId: teamIds[1].id, roundId: round2.id, scores: { [c2a]: 42, [c2b]: 45 }, total: 87 },

    // CyberSentinels: R1 (19+18 = 37/50)
    { teamId: teamIds[2].id, roundId: round1.id, scores: { [c1a]: 19, [c1b]: 18 }, total: 37 },

    // OmniVibe Studio: R1 (20+20 = 40/50)
    { teamId: teamIds[3].id, roundId: round1.id, scores: { [c1a]: 20, [c1b]: 20 }, total: 40 },
  ];

  for (const ev of evals) {
    await client.query(`
      INSERT INTO public.evaluations (event_id, round_id, team_id, jury_id, scores, total)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6);
    `, [event.id, ev.roundId, ev.teamId, adminId, JSON.stringify(ev.scores), ev.total]);
  }
  console.log('✅ Created Evaluations');

  // Trigger refresh leaderboard
  await client.query('SELECT public.refresh_leaderboard($1);', [event.id]);

  // Check generated ranks
  const ranksRes = await client.query('SELECT rank, team_name FROM public.leaderboard_ranks WHERE event_id = $1 ORDER BY rank ASC;', [event.id]);
  console.log('\n🏆 Generated Leaderboard Standings:');
  console.table(ranksRes.rows);

  console.log('\n🌐 Test URLs:');
  console.log(`- Public Live Board: http://localhost:3000/live/${event.slug}`);
  console.log(`- Public Token URL:  http://localhost:3000/l/${event.public_token}`);

  await client.end();
}

seed().catch(console.error);
