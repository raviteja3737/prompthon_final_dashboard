import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) return match[1];
    }
  } catch (e) {
    console.error('Error reading .env for database URL:', e);
  }
  return process.env.DATABASE_URL || '';
}

function databaseApiPlugin(): Plugin {
  let pool: pg.Pool | null = null;

  return {
    name: 'database-api-plugin',
    configureServer(server) {
      const dbUrl = getDatabaseUrl();
      pool = new pg.Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;
        const method = req.method?.toUpperCase();

        res.setHeader('Content-Type', 'application/json');

        // Helper to parse JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch (err) {
                reject(err);
              }
            });
            req.on('error', reject);
          });
        };

        try {
          if (!pool) throw new Error('Database pool not initialized');

          // TEAMS
          if (pathname === '/api/teams' && method === 'GET') {
            const result = await pool.query('SELECT * FROM public.teams ORDER BY name ASC;');
            res.end(JSON.stringify({ data: result.rows }));
            return;
          }

          if (pathname === '/api/teams' && method === 'POST') {
            const body = await readBody();
            if (Array.isArray(body)) {
              for (const t of body) {
                const id = t.id || `team-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                await pool.query(
                  'INSERT INTO public.teams (id, name, members, tag, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, members = EXCLUDED.members, tag = EXCLUDED.tag;',
                  [id, t.name, t.members || '', t.tag || 'Batch Registered']
                );
              }
              res.end(JSON.stringify({ success: true, count: body.length }));
            } else {
              const id = body.id || `team-${Date.now()}`;
              const insertRes = await pool.query(
                'INSERT INTO public.teams (id, name, members, tag, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *;',
                [id, body.name, body.members || '', body.tag || 'Batch Registered']
              );
              res.end(JSON.stringify({ data: insertRes.rows[0] }));
            }
            return;
          }

          if (pathname.startsWith('/api/teams/') && method === 'DELETE') {
            const id = pathname.replace('/api/teams/', '');
            await pool.query('DELETE FROM public.teams WHERE id = $1;', [id]);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // JURIES
          if (pathname === '/api/juries' && method === 'GET') {
            const result = await pool.query('SELECT * FROM public.juries ORDER BY id ASC;');
            res.end(JSON.stringify({ data: result.rows }));
            return;
          }

          if (pathname === '/api/juries' && method === 'POST') {
            const body = await readBody();
            const id = body.id || `jury-${Date.now()}`;
            const resJury = await pool.query(
              'INSERT INTO public.juries (id, email, password, name, created_date, created_at) VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW()) RETURNING *;',
              [id, body.email.toLowerCase().trim(), body.password, body.name]
            );
            res.end(JSON.stringify({ data: resJury.rows[0] }));
            return;
          }

          if (pathname.startsWith('/api/juries/') && method === 'DELETE') {
            const id = pathname.replace('/api/juries/', '');
            await pool.query('DELETE FROM public.juries WHERE id = $1;', [id]);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // EVALUATIONS
          if (pathname === '/api/evaluations' && method === 'GET') {
            const result = await pool.query('SELECT * FROM public.evaluations ORDER BY timestamp DESC;');
            res.end(JSON.stringify({ data: result.rows }));
            return;
          }

          if (pathname === '/api/evaluations' && method === 'POST') {
            const body = await readBody();
            const id = body.id || `eval-${Date.now()}`;
            const total =
              Number(body.criteria?.innovation || 0) +
              Number(body.criteria?.tech || 0) +
              Number(body.criteria?.feasibility || 0) +
              Number(body.criteria?.presentation || 0);

            const resEval = await pool.query(
              `INSERT INTO public.evaluations (id, team_id, jury_id, jury_email, round, criteria, total, remarks, timestamp)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 criteria = EXCLUDED.criteria,
                 total = EXCLUDED.total,
                 remarks = EXCLUDED.remarks,
                 timestamp = NOW()
               RETURNING *;`,
              [id, body.team_id || body.teamId, body.jury_id || body.juryId, body.jury_email || body.juryEmail, body.round, JSON.stringify(body.criteria), total, body.remarks || '']
            );
            res.end(JSON.stringify({ data: resEval.rows[0] }));
            return;
          }

          if (pathname.startsWith('/api/evaluations/') && method === 'PUT') {
            const id = pathname.replace('/api/evaluations/', '');
            const body = await readBody();
            const total =
              Number(body.criteria?.innovation || 0) +
              Number(body.criteria?.tech || 0) +
              Number(body.criteria?.feasibility || 0) +
              Number(body.criteria?.presentation || 0);

            await pool.query(
              'UPDATE public.evaluations SET criteria = $1, total = $2, remarks = $3, timestamp = NOW() WHERE id = $4;',
              [JSON.stringify(body.criteria), total, body.remarks || '', id]
            );
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname.startsWith('/api/evaluations/') && method === 'DELETE') {
            const id = pathname.replace('/api/evaluations/', '');
            await pool.query('DELETE FROM public.evaluations WHERE id = $1;', [id]);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // SETTINGS
          if (pathname === '/api/settings' && method === 'GET') {
            const result = await pool.query("SELECT value FROM public.app_settings WHERE key = 'competition_state';");
            res.end(JSON.stringify({ data: result.rows[0]?.value || null }));
            return;
          }

          if (pathname === '/api/settings' && method === 'POST') {
            const body = await readBody();
            await pool.query(
              `INSERT INTO public.app_settings (key, value, updated_at)
               VALUES ('competition_state', $1::jsonb, NOW())
               ON CONFLICT (key) DO UPDATE SET
                 value = EXCLUDED.value,
                 updated_at = NOW();`,
              [JSON.stringify(body)]
            );
            res.end(JSON.stringify({ success: true, value: body }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          console.error('API Error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), databaseApiPlugin()],
  server: {
    port: 3000,
    open: true
  }
});
