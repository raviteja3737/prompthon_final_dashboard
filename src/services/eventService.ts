import { supabase, callEdgeFunction } from '../lib/supabaseClient';
import type { Event, CreatedCredentials } from '../types';

export const eventService = {
  async listAllEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Enrich with counts
    const events = data || [];
    const enriched = await Promise.all(events.map(async (e: Event) => {
      const [{ count: tc }, { count: jc }, { count: rc }] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('event_id', e.id),
        supabase.from('event_members').select('user_id', { count: 'exact', head: true }).eq('event_id', e.id).eq('role', 'jury'),
        supabase.from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', e.id),
      ]);
      return { ...e, teams_count: tc ?? 0, juries_count: jc ?? 0, rounds_count: rc ?? 0 };
    }));
    return enriched;
  },

  async getEvent(eventId: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getEventBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createEvent(eventName: string, organizerEmail: string): Promise<CreatedCredentials> {
    const result = await callEdgeFunction<CreatedCredentials>('create-event', { eventName, organizerEmail });
    result.loginUrl = window.location.origin;
    return result;
  },

  async updateEventStatus(eventId: string, status: 'draft' | 'active' | 'closed'): Promise<void> {
    const { error } = await supabase.from('events').update({ status }).eq('id', eventId);
    if (error) throw error;
  },

  async toggleLeaderboard(eventId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase.from('events').update({ leaderboard_enabled: enabled }).eq('id', eventId);
    if (error) throw error;
    if (enabled) {
      try {
        await supabase.rpc('refresh_leaderboard', { p_event_id: eventId });
      } catch {
        // best effort
      }
    }
  },

  async regenerateToken(eventId: string): Promise<string> {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    const newToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.from('events').update({ public_token: newToken }).eq('id', eventId);
    if (error) throw error;
    return newToken;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  },

  async getEventStats(eventId: string): Promise<{
    teams: number; participants: number; juries: number;
    rounds: number; evaluations: number;
  }> {
    const [teams, participants, juries, rounds, evaluations] = await Promise.all([
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.from('participants').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.from('event_members').select('user_id', { count: 'exact', head: true }).eq('event_id', eventId).eq('role', 'jury'),
      supabase.from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);
    return {
      teams: teams.count ?? 0,
      participants: participants.count ?? 0,
      juries: juries.count ?? 0,
      rounds: rounds.count ?? 0,
      evaluations: evaluations.count ?? 0,
    };
  }
};
