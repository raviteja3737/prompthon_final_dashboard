import psycopg2
import json

import os
import re

def get_db_url():
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            match = re.search(r'DATABASE_URL=["\']?([^"\'\r\n]+)["\']?', f.read())
            if match:
                return match.group(1)
    return os.environ.get('DATABASE_URL', '')

INITIAL_TEAMS = [
  { 'id': 'team-1', 'name': 'NeuralCrafters', 'members': 'Aarav Sharma, Priya Patel, Rohan Mehta', 'tag': 'FinTech AI' },
  { 'id': 'team-2', 'name': 'QuantumLeap AI', 'members': 'Devika Nair, Aditya Verma, Sneha Sen', 'tag': 'Quantum ML' },
  { 'id': 'team-3', 'name': 'EcoFlow Dynamics', 'members': 'Kavita Joshi, Arjun Deshmukh', 'tag': 'CleanTech' },
  { 'id': 'team-4', 'name': 'BioSync Healthcare', 'members': 'Tanvi Iyer, Siddharth Roy, Ananya Das', 'tag': 'HealthTech' },
  { 'id': 'team-5', 'name': 'CyberAegis Security', 'members': 'Varun Grover, Meera Pillai, Yash Kulkarni', 'tag': 'CyberSec' },
  { 'id': 'team-6', 'name': 'NovaVision Labs', 'members': 'Rajesh Bhatia, Simran Kaur', 'tag': 'Computer Vision' }
]

INITIAL_JURIES = [
  { 'id': 'jury-1', 'email': 'jury1@evalpro.org', 'password': 'Jury#9412!X', 'name': 'Jury Panel 01', 'createdDate': '2026-09-20' },
  { 'id': 'jury-2', 'email': 'jury2@evalpro.org', 'password': 'Jury#8831!K', 'name': 'Jury Panel 02', 'createdDate': '2026-09-20' },
  { 'id': 'jury-3', 'email': 'jury3@evalpro.org', 'password': 'Jury#7124!M', 'name': 'Jury Panel 03', 'createdDate': '2026-09-20' },
  { 'id': 'jury-4', 'email': 'jury4@evalpro.org', 'password': 'Jury#6291!Z', 'name': 'Jury Panel 04', 'createdDate': '2026-09-20' },
  { 'id': 'jury-5', 'email': 'jury5@evalpro.org', 'password': 'Jury#5140!Q', 'name': 'Jury Panel 05', 'createdDate': '2026-09-21' },
]

INITIAL_EVALS = [
  {
    'id': 'eval-1',
    'teamId': 'team-1',
    'juryId': 'jury-1',
    'juryEmail': 'jury1@evalpro.org',
    'round': 1,
    'criteria': { 'innovation': 24, 'tech': 23, 'feasibility': 22, 'presentation': 24 },
    'total': 93,
    'remarks': 'Impressive architecture and production readiness.',
    'timestamp': '2026-09-21 10:30'
  },
  {
    'id': 'eval-2',
    'teamId': 'team-2',
    'juryId': 'jury-1',
    'juryEmail': 'jury1@evalpro.org',
    'round': 1,
    'criteria': { 'innovation': 22, 'tech': 24, 'feasibility': 21, 'presentation': 21 },
    'total': 88,
    'remarks': 'Superb algorithm, UI requires slightly clearer telemetry.',
    'timestamp': '2026-09-21 11:00'
  },
  {
    'id': 'eval-3',
    'teamId': 'team-1',
    'juryId': 'jury-2',
    'juryEmail': 'jury2@evalpro.org',
    'round': 1,
    'criteria': { 'innovation': 23, 'tech': 22, 'feasibility': 24, 'presentation': 23 },
    'total': 92,
    'remarks': 'Strong product-market alignment and unit economics.',
    'timestamp': '2026-09-21 11:20'
  }
]

def seed_database():
    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor()
    
    print("Seeding teams...")
    for t in INITIAL_TEAMS:
        cur.execute(
            """
            INSERT INTO public.teams (id, name, members, tag)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                members = EXCLUDED.members,
                tag = EXCLUDED.tag;
            """,
            (t['id'], t['name'], t['members'], t['tag'])
        )

    print("Seeding juries...")
    for j in INITIAL_JURIES:
        cur.execute(
            """
            INSERT INTO public.juries (id, email, password, name, created_date)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                password = EXCLUDED.password,
                name = EXCLUDED.name,
                created_date = EXCLUDED.created_date;
            """,
            (j['id'], j['email'], j['password'], j['name'], j['createdDate'])
        )

    print("Seeding evaluations...")
    for ev in INITIAL_EVALS:
        cur.execute(
            """
            INSERT INTO public.evaluations (id, team_id, jury_id, jury_email, round, criteria, total, remarks, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                team_id = EXCLUDED.team_id,
                jury_id = EXCLUDED.jury_id,
                jury_email = EXCLUDED.jury_email,
                round = EXCLUDED.round,
                criteria = EXCLUDED.criteria,
                total = EXCLUDED.total,
                remarks = EXCLUDED.remarks,
                timestamp = EXCLUDED.timestamp;
            """,
            (ev['id'], ev['teamId'], ev['juryId'], ev['juryEmail'], ev['round'], json.dumps(ev['criteria']), ev['total'], ev['remarks'], ev['timestamp'])
        )

    conn.commit()
    print("Seeding completed successfully!")

    # Verify counts
    for table in ['teams', 'juries', 'evaluations', 'app_settings']:
        cur.execute(f"SELECT COUNT(*) FROM public.{table};")
        count = cur.fetchone()[0]
        print(f"Table '{table}' has {count} rows.")

    cur.close()
    conn.close()

if __name__ == '__main__':
    seed_database()
