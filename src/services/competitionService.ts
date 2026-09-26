import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Team, Jury, Evaluation, EvaluationCriteria } from '../types';

async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Only attempt local /api endpoints when running Vite dev server locally
  if (!import.meta.env.DEV) return null;

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    // API not responding or not in dev server
  }
  return null;
}

export const competitionService = {
  // ---------------- TEAMS ----------------
  async getTeams(): Promise<Team[]> {
    // Try local /api first
    const apiRes = await fetchApi('/api/teams');
    if (apiRes && Array.isArray(apiRes.data)) {
      return apiRes.data;
    }

    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
    return data || [];
  },

  async addTeam(team: { id?: string; name: string; members: string; tag?: string }): Promise<Team> {
    const newTeam = {
      id: team.id || `team-${Date.now()}`,
      name: team.name,
      members: team.members,
      tag: team.tag || 'Batch Registered'
    };

    const apiRes = await fetchApi('/api/teams', {
      method: 'POST',
      body: JSON.stringify(newTeam)
    });
    if (apiRes && apiRes.data) return apiRes.data;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('teams')
      .insert([newTeam])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async batchAddTeams(teams: { name: string; members: string; tag?: string }[]): Promise<Team[]> {
    const rows = teams.map((t, idx) => ({
      id: `team-${Date.now()}-${idx}`,
      name: t.name,
      members: t.members,
      tag: t.tag || 'Batch Registered'
    }));

    const apiRes = await fetchApi('/api/teams', {
      method: 'POST',
      body: JSON.stringify(rows)
    });
    if (apiRes && apiRes.success) return rows;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('teams')
      .insert(rows)
      .select();

    if (error) throw error;
    return data || [];
  },

  async deleteTeam(id: string): Promise<void> {
    const apiRes = await fetchApi(`/api/teams/${id}`, { method: 'DELETE' });
    if (apiRes && apiRes.success) return;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ---------------- JURIES ----------------
  async getJuries(): Promise<Jury[]> {
    const apiRes = await fetchApi('/api/juries');
    if (apiRes && Array.isArray(apiRes.data)) {
      return apiRes.data;
    }

    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('juries')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching juries:', error);
      throw error;
    }
    return data || [];
  },

  async createJury(jury: { name: string; email: string; password: string }): Promise<Jury> {
    const cleanEmail = jury.email.toLowerCase().trim();
    const newJury = {
      id: `jury-${Date.now()}`,
      name: jury.name,
      email: cleanEmail,
      password: jury.password,
      created_date: new Date().toISOString().split('T')[0]
    };

    // 1. Register in Supabase Auth (generates credentials, auto-confirmed via trigger, app_metadata.role = 'jury')
    try {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: jury.password,
        options: {
          data: { name: jury.name, role: 'jury' }
        }
      });
    } catch (authErr) {
      console.warn('Supabase Auth user create notice:', authErr);
    }

    // 2. Insert into public.juries roster table
    const apiRes = await fetchApi('/api/juries', {
      method: 'POST',
      body: JSON.stringify(newJury)
    });
    if (apiRes && apiRes.data) return apiRes.data;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('juries')
      .insert([newJury])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteJury(id: string): Promise<void> {
    const apiRes = await fetchApi(`/api/juries/${id}`, { method: 'DELETE' });
    if (apiRes && apiRes.success) return;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('juries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ---------------- EVALUATIONS ----------------
  async getEvaluations(): Promise<Evaluation[]> {
    const apiRes = await fetchApi('/api/evaluations');
    let rawList: any[] = [];
    if (apiRes && Array.isArray(apiRes.data)) {
      rawList = apiRes.data;
    } else if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        throw error;
      }
      rawList = data || [];
    }

    return rawList.map((ev: any) => ({
      id: ev.id,
      teamId: ev.team_id,
      team_id: ev.team_id,
      juryId: ev.jury_id,
      jury_id: ev.jury_id,
      juryEmail: ev.jury_email,
      jury_email: ev.jury_email,
      round: ev.round,
      criteria: typeof ev.criteria === 'string' ? JSON.parse(ev.criteria) : (ev.criteria || {
        innovation: ev.innovation || 20,
        tech: ev.tech || 20,
        feasibility: ev.feasibility || 20,
        presentation: ev.presentation || 20
      }),
      total: ev.total,
      remarks: ev.remarks || '',
      timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''
    }));
  },

  async submitEvaluation(evaluation: {
    teamId: string;
    juryId: string;
    juryEmail: string;
    round: number;
    criteria: EvaluationCriteria;
    remarks: string;
  }): Promise<Evaluation> {
    const total =
      Number(evaluation.criteria.innovation) +
      Number(evaluation.criteria.tech) +
      Number(evaluation.criteria.feasibility) +
      Number(evaluation.criteria.presentation);

    const newRow = {
      id: `eval-${Date.now()}`,
      team_id: evaluation.teamId,
      jury_id: evaluation.juryId,
      jury_email: evaluation.juryEmail,
      round: evaluation.round,
      criteria: evaluation.criteria,
      total: total,
      remarks: evaluation.remarks,
      timestamp: new Date().toISOString()
    };

    const apiRes = await fetchApi('/api/evaluations', {
      method: 'POST',
      body: JSON.stringify(newRow)
    });
    if (apiRes && apiRes.data) {
      return {
        id: apiRes.data.id,
        teamId: apiRes.data.team_id,
        team_id: apiRes.data.team_id,
        juryId: apiRes.data.jury_id,
        jury_id: apiRes.data.jury_id,
        juryEmail: apiRes.data.jury_email,
        jury_email: apiRes.data.jury_email,
        round: apiRes.data.round,
        criteria: typeof apiRes.data.criteria === 'string' ? JSON.parse(apiRes.data.criteria) : apiRes.data.criteria,
        total: apiRes.data.total,
        remarks: apiRes.data.remarks,
        timestamp: new Date(apiRes.data.timestamp).toLocaleString()
      };
    }

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('evaluations')
      .insert([newRow])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      teamId: data.team_id,
      team_id: data.team_id,
      juryId: data.jury_id,
      jury_id: data.jury_id,
      juryEmail: data.jury_email,
      jury_email: data.jury_email,
      round: data.round,
      criteria: data.criteria,
      total: data.total,
      remarks: data.remarks,
      timestamp: new Date(data.timestamp).toLocaleString()
    };
  },

  async updateEvaluation(id: string, criteria: EvaluationCriteria, remarks: string): Promise<void> {
    const apiRes = await fetchApi(`/api/evaluations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ criteria, remarks })
    });
    if (apiRes && apiRes.success) return;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const newTotal =
      Number(criteria.innovation) +
      Number(criteria.tech) +
      Number(criteria.feasibility) +
      Number(criteria.presentation);

    const { error } = await supabase
      .from('evaluations')
      .update({
        criteria: criteria,
        total: newTotal,
        remarks: remarks,
        timestamp: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteEvaluation(id: string): Promise<void> {
    const apiRes = await fetchApi(`/api/evaluations/${id}`, { method: 'DELETE' });
    if (apiRes && apiRes.success) return;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('evaluations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ---------------- COMPETITION SETTINGS (app_settings) ----------------
  async getSettings(): Promise<{ current_active_round: number; round_1_locked: boolean; round_2_started: boolean; leaderboard_visible?: boolean } | null> {
    const apiRes = await fetchApi('/api/settings');
    if (apiRes && apiRes.data) {
      return {
        current_active_round: apiRes.data.currentActiveRound ?? 1,
        round_1_locked: Boolean(apiRes.data.round1Locked),
        round_2_started: Boolean(apiRes.data.round2Started),
        leaderboard_visible: apiRes.data.leaderboardVisible ?? true
      };
    }

    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'competition_state')
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
    if (data && data.value) {
      return {
        current_active_round: data.value.currentActiveRound ?? 1,
        round_1_locked: Boolean(data.value.round1Locked),
        round_2_started: Boolean(data.value.round2Started),
        leaderboard_visible: data.value.leaderboardVisible ?? true
      };
    }
    return null;
  },

  async updateSettings(settings: {
    current_active_round?: number;
    round_1_locked?: boolean;
    round_2_started?: boolean;
    leaderboard_visible?: boolean;
  }): Promise<void> {
    const current = await this.getSettings() || {
      current_active_round: 1,
      round_1_locked: false,
      round_2_started: false,
      leaderboard_visible: true
    };

    const updatedValue = {
      currentActiveRound: settings.current_active_round ?? current.current_active_round,
      round1Locked: settings.round_1_locked ?? current.round_1_locked,
      round2Started: settings.round_2_started ?? current.round_2_started,
      leaderboardVisible: settings.leaderboard_visible !== undefined ? settings.leaderboard_visible : (current.leaderboard_visible ?? true)
    };

    const apiRes = await fetchApi('/api/settings', {
      method: 'POST',
      body: JSON.stringify(updatedValue)
    });
    if (apiRes && apiRes.success) return;

    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'competition_state',
        value: updatedValue,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  // ---------------- REALTIME SUBSCRIPTION ----------------
  subscribeToAll(onUpdate: () => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('evalpro_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'juries' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
