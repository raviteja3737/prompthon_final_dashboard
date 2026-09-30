import { supabase } from '../lib/supabaseClient';
import type { LeaderboardRank, PublicLeaderboardEntry } from '../types';

export const leaderboardService = {
  /** For organizers/admin - shows full data including scores */
  async getLeaderboard(eventId: string): Promise<LeaderboardRank[]> {
    const { data, error } = await supabase
      .from('leaderboard_ranks')
      .select('*')
      .eq('event_id', eventId)
      .order('rank', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
  },

  /** For public - rank + name only, via SECURITY DEFINER RPC */
  async getPublicLeaderboard(token: string): Promise<PublicLeaderboardEntry[]> {
    const { data, error } = await supabase
      .rpc('get_public_leaderboard', { p_token: token });
    if (error) throw error;
    return data || [];
  },

  /** For public - check if event exists and if leaderboard is enabled */
  async getPublicLeaderboardMeta(token: string): Promise<{ event_id: string; event_name: string; leaderboard_enabled: boolean; status: string } | null> {
    const { data, error } = await supabase
      .rpc('get_public_leaderboard_meta', { p_token: token });
    if (error) throw error;
    return (data && data[0]) || null;
  },

  /** Manually trigger a leaderboard refresh (super admin only) */
  async refreshLeaderboard(eventId: string): Promise<void> {
    const { error } = await supabase.rpc('refresh_leaderboard', { p_event_id: eventId });
    if (error) throw error;
  },

  /** Subscribe to real-time leaderboard changes for public display */
  subscribeToPublicLeaderboard(eventId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`leaderboard_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_ranks', filter: `event_id=eq.${eventId}` },
        () => onUpdate()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
