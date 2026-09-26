import csv
import json
import psycopg2

import os
import re

def get_db_url():
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            match = re.search(r'DATABASE_URL=["\']?([^"\'\r\n]+)["\']?', f.read())
            if match:
                return match.group(1)
    return os.environ.get('DATABASE_URL', '')

def parse_csv_teams():
    teams = []
    with open('data_from_user.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, r in enumerate(reader):
            team_name = (r.get('Team  Name') or r.get('Team Name') or '').strip()
            domain = (r.get('Domains ') or r.get('Domains') or '').strip()
            leader = (r.get('Full Name (Team Leader)') or '').strip()
            m1 = (r.get('Name (Team Member 1)') or '').strip()
            m2 = (r.get('Name (Team Member 2)') or '').strip()
            m3 = (r.get('Name (Team Member 3)') or '').strip()

            valid_members = []
            for name in [leader, m1, m2, m3]:
                n = name.strip()
                if n and n.upper() not in ['NA', 'N/A', 'NO', '-']:
                    if n not in valid_members:
                        valid_members.append(n)

            members_str = ", ".join(valid_members) if valid_members else leader or "Unspecified"
            tag = domain if domain else "Open Innovation"

            team_id = f"team-{str(i+1).zfill(3)}"
            teams.append({
                'id': team_id,
                'name': team_name,
                'members': members_str,
                'tag': tag
            })
    return teams

def seed_database():
    teams = parse_csv_teams()
    print(f"Parsed {len(teams)} teams from CSV.")

    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor()

    print("Purging mock evaluations...")
    cur.execute("DELETE FROM public.evaluations WHERE id IN ('eval-1', 'eval-2', 'eval-3') OR team_id LIKE 'team-%';")
    print(f"Purged evaluations. Remaining evaluations: 0")

    print("Purging mock teams...")
    cur.execute("DELETE FROM public.teams;")
    print("Purged all old/mock teams.")

    print(f"Inserting {len(teams)} real teams into public.teams...")
    for t in teams:
        cur.execute(
            """
            INSERT INTO public.teams (id, name, members, tag, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                members = EXCLUDED.members,
                tag = EXCLUDED.tag;
            """,
            (t['id'], t['name'], t['members'], t['tag'])
        )

    # Ensure competition_state in app_settings has leaderboardVisible: true
    print("Updating app_settings...")
    default_state = {
        "currentActiveRound": 1,
        "round1Locked": False,
        "round2Started": False,
        "leaderboardVisible": True
    }
    cur.execute(
        """
        INSERT INTO public.app_settings (key, value, updated_at)
        VALUES ('competition_state', %s::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW();
        """,
        (json.dumps(default_state),)
    )

    conn.commit()

    # Verification
    cur.execute("SELECT count(*) FROM public.teams;")
    team_count = cur.fetchone()[0]
    print(f"Verified teams in database: {team_count}")

    cur.execute("SELECT count(*) FROM public.evaluations;")
    eval_count = cur.fetchone()[0]
    print(f"Verified evaluations in database: {eval_count}")

    cur.execute("SELECT value FROM public.app_settings WHERE key = 'competition_state';")
    settings = cur.fetchone()[0]
    print(f"Verified competition_state: {settings}")

    cur.close()
    conn.close()

    # Generate src/data/teamsData.ts
    ts_content = "import { Team, Evaluation } from '../types';\n\n"
    ts_content += f"export const INITIAL_TEAMS: Team[] = {json.dumps(teams, indent=2)};\n\n"
    ts_content += "export const INITIAL_EVALUATIONS: Evaluation[] = [];\n"

    with open('src/data/teamsData.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print("Generated src/data/teamsData.ts successfully.")

if __name__ == '__main__':
    seed_database()
