import { supabase, callEdgeFunction } from '../lib/supabaseClient';
import type { EventMember, CreatedCredentials } from '../types';

export const juryService = {
  async getJuries(eventId: string): Promise<EventMember[]> {
    const { data, error } = await supabase
      .from('event_members')
      .select('*')
      .eq('event_id', eventId)
      .eq('role', 'jury')
      .order('display_name');
    if (error) throw error;

    // Fetch submission progress per jury
    const juryIds = (data || []).map((j: EventMember) => j.user_id);
    if (juryIds.length === 0) return [];

    const { count: totalTeams } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const submissionCounts = await Promise.all(
      juryIds.map(async (jid: string) => {
        const { count } = await supabase
          .from('evaluations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('jury_id', jid);
        return { jid, count: count ?? 0 };
      })
    );
    const countMap = Object.fromEntries(submissionCounts.map(s => [s.jid, s.count]));

    return (data || []).map((j: EventMember) => ({
      ...j,
      submission_count: countMap[j.user_id] ?? 0,
      total_teams: totalTeams ?? 0,
    }));
  },

  async createJury(eventId: string, juryName: string, juryEmail: string): Promise<CreatedCredentials> {
    return callEdgeFunction<CreatedCredentials>('create-jury', { eventId, juryName, juryEmail });
  },

  async removeJury(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_members')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async resetJuryPassword(targetUserId: string, eventId: string): Promise<string> {
    const result = await callEdgeFunction<{ password: string }>('reset-password', { targetUserId, eventId });
    return result.password;
  },
};
