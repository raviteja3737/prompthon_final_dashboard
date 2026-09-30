import { supabase } from '../lib/supabaseClient';
import type { Round, Criterion } from '../types';

export const roundsService = {
  async getRounds(eventId: string): Promise<Round[]> {
    const { data, error } = await supabase
      .from('rounds')
      .select('*, criteria(*)')
      .eq('event_id', eventId)
      .order('seq', { ascending: true });
    if (error) throw error;

    return (data || []).map((r: Round & { criteria: Criterion[] }) => ({
      ...r,
      criteria: (r.criteria || []).sort((a, b) => a.seq - b.seq),
      max_marks_total: (r.criteria || []).reduce((s, c) => s + Number(c.max_marks), 0),
    }));
  },

  async createRound(eventId: string, name: string, seq: number, weight = 1): Promise<Round> {
    const { data, error } = await supabase
      .from('rounds')
      .insert({ event_id: eventId, name, seq, weight })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRound(roundId: string, updates: Partial<Pick<Round, 'name' | 'status' | 'weight' | 'seq'>>): Promise<void> {
    const { error } = await supabase
      .from('rounds')
      .update(updates)
      .eq('id', roundId);
    if (error) throw error;
  },

  async deleteRound(roundId: string): Promise<void> {
    // Check no evaluations exist
    const { count } = await supabase
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId);
    if (count && count > 0) throw new Error('Cannot delete a round that has evaluations.');
    const { error } = await supabase.from('rounds').delete().eq('id', roundId);
    if (error) throw error;
  },

  // ── CRITERIA ──
  async setCriteria(roundId: string, criteria: { label: string; max_marks: number; seq: number }[]): Promise<void> {
    // Check round has no evaluations before allowing criteria edits
    const { count } = await supabase
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId);
    if (count && count > 0) {
      throw new Error('Cannot edit criteria after submissions have been made for this round.');
    }

    // Delete all existing, then re-insert
    await supabase.from('criteria').delete().eq('round_id', roundId);
    if (criteria.length === 0) return;

    const rows = criteria.map(c => ({ round_id: roundId, ...c }));
    const { error } = await supabase.from('criteria').insert(rows);
    if (error) throw error;
  },

  async getCriteria(roundId: string): Promise<Criterion[]> {
    const { data, error } = await supabase
      .from('criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('seq', { ascending: true });
    if (error) throw error;
    return data || [];
  },
};
