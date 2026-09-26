import csv

def parse_csv():
    with open('data_from_user.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        print(f"Total rows in CSV: {len(rows)}")
        parsed_teams = []
        for i, r in enumerate(rows):
            # Header has 'Team  Name' with two spaces
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
                    # Avoid duplicate member names within a team
                    if n not in valid_members:
                        valid_members.append(n)

            members_str = ", ".join(valid_members) if valid_members else leader or "Unspecified"
            tag = domain if domain else "Open Innovation"

            parsed_teams.append({
                'index': i + 1,
                'name': team_name,
                'members': members_str,
                'tag': tag
            })

        for t in parsed_teams:
            print(f"{t['index']}. [{t['tag']}] {t['name']} -> {t['members']}")

        # Check for duplicate team names
        names = [t['name'].lower() for t in parsed_teams]
        duplicates = set([x for x in names if names.count(x) > 1])
        if duplicates:
            print(f"\nWarning! Duplicate team names found: {duplicates}")

if __name__ == '__main__':
    parse_csv()
