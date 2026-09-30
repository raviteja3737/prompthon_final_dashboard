import { supabase } from '../lib/supabaseClient';
import type { Team, Participant } from '../types';

export const teamsService = {
  async getTeams(eventId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*, participants(*)')
      .eq('event_id', eventId)
      .order('name', { ascending: true });
    if (error) throw error;

    return (data || []).map((t: Team) => ({
      ...t,
      members: (t.participants || []).map((p: Participant) => p.name).join(', '),
    }));
  },

  async searchTeams(eventId: string, query: string): Promise<Team[]> {
    if (!query.trim()) return this.getTeams(eventId);

    const { data, error } = await supabase
      .rpc('search_teams_adaptive', { p_event_id: eventId, p_query: query });
    if (error) throw error;

    return (data || []).map((r: { team_id: string; team_name: string; tag: string; members: string }) => ({
      id: r.team_id,
      event_id: eventId,
      name: r.team_name,
      tag: r.tag ?? '',
      extra: {},
      created_at: '',
      members: r.members ?? '',
    }));
  },

  async createTeam(eventId: string, name: string, tag: string, members: string[]): Promise<Team> {
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ event_id: eventId, name, tag })
      .select()
      .single();
    if (error) throw error;

    if (members.length > 0) {
      const participants = members.map(m => ({
        event_id: eventId,
        team_id: team.id,
        name: m.trim(),
      }));
      await supabase.from('participants').insert(participants);
    }

    return { ...team, members: members.join(', '), participants: [] };
  },

  async updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'tag'>>): Promise<void> {
    const { error } = await supabase.from('teams').update(updates).eq('id', teamId);
    if (error) throw error;
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw error;
  },

  async bulkCreateTeams(eventId: string, rows: { name: string; tag?: string; members: string[] }[]): Promise<{ created: number; skipped: number }> {
    let created = 0, skipped = 0;

    // Get existing team names
    const { data: existing } = await supabase
      .from('teams')
      .select('name')
      .eq('event_id', eventId);
    const existingNames = new Set((existing || []).map(t => t.name.toLowerCase().trim()));

    for (const row of rows) {
      if (existingNames.has(row.name.toLowerCase().trim())) { skipped++; continue; }

      const { data: team, error } = await supabase
        .from('teams')
        .insert({ event_id: eventId, name: row.name.trim(), tag: row.tag || '' })
        .select()
        .single();

      if (error) { skipped++; continue; }

      if (row.members.length > 0) {
        const parts = row.members.map(m => ({ event_id: eventId, team_id: team.id, name: m.trim() })).filter(p => p.name);
        if (parts.length > 0) await supabase.from('participants').insert(parts);
      }
      created++;
    }

    return { created, skipped };
  },

  async getParticipants(eventId: string, teamId?: string): Promise<Participant[]> {
    let q = supabase.from('participants').select('*').eq('event_id', eventId);
    if (teamId) q = q.eq('team_id', teamId);
    const { data, error } = await q.order('name');
    if (error) throw error;
    return data || [];
  },
};
