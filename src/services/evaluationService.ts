import { supabase } from '../lib/supabaseClient';
import type { Evaluation, AuditLog } from '../types';

export const evaluationService = {
  async getEvaluations(eventId: string, filters?: { roundId?: string; teamId?: string; juryId?: string }): Promise<Evaluation[]> {
    let q = supabase
      .from('evaluations')
      .select(`
        *,
        teams(name),
        rounds(name, seq),
        event_members!jury_id(display_name, email)
      `)
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: false });

    if (filters?.roundId) q = q.eq('round_id', filters.roundId);
    if (filters?.teamId)  q = q.eq('team_id', filters.teamId);
    if (filters?.juryId)  q = q.eq('jury_id', filters.juryId);

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((e) => ({
      ...(e as unknown as Evaluation),
      team_name: (e as unknown as Record<string, {name:string}|null>).teams?.name ?? '',
      round_name: (e as unknown as Record<string, {name:string}|null>).rounds?.name ?? '',
      round_seq: (e as unknown as Record<string, {seq:number}|null>).rounds?.seq ?? 0,
      jury_name: (e as unknown as Record<string, {display_name:string}|null>).event_members?.display_name ?? '',
      jury_email: (e as unknown as Record<string, {email:string}|null>).event_members?.email ?? '',
    }));
  },

  async getMyEvaluations(eventId: string): Promise<Evaluation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return this.getEvaluations(eventId, { juryId: user.id });
  },

  async submitEvaluation(params: {
    eventId: string;
    roundId: string;
    teamId: string;
    scores: Record<string, number>;
    remarks: string;
  }): Promise<Evaluation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const total = Object.values(params.scores).reduce((s, v) => s + Number(v), 0);

    const { data, error } = await supabase
      .from('evaluations')
      .upsert({
        event_id: params.eventId,
        round_id: params.roundId,
        team_id: params.teamId,
        jury_id: user.id,
        scores: params.scores,
        total,
        remarks: params.remarks,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'round_id,team_id,jury_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvaluation(
    evalId: string,
    scores: Record<string, number>,
    remarks: string,
    actorId: string,
    eventId: string
  ): Promise<void> {
    // Fetch before state for audit
    const { data: before } = await supabase.from('evaluations').select('*').eq('id', evalId).single();

    const total = Object.values(scores).reduce((s, v) => s + Number(v), 0);
    const { error } = await supabase
      .from('evaluations')
      .update({ scores, total, remarks, updated_at: new Date().toISOString() })
      .eq('id', evalId);
    if (error) throw error;

    // Audit log
    await supabase.from('audit_log').insert({
      event_id: eventId,
      actor_id: actorId,
      action: 'edit_mark',
      entity: 'evaluations',
      entity_id: evalId,
      before: before || {},
      after: { scores, total, remarks },
    });
  },

  async deleteEvaluation(evalId: string, actorId: string, eventId: string): Promise<void> {
    const { data: before } = await supabase.from('evaluations').select('*').eq('id', evalId).single();

    const { error } = await supabase.from('evaluations').delete().eq('id', evalId);
    if (error) throw error;

    await supabase.from('audit_log').insert({
      event_id: eventId,
      actor_id: actorId,
      action: 'delete_mark',
      entity: 'evaluations',
      entity_id: evalId,
      before: before || {},
      after: {},
    });
  },

  async getAuditLog(eventId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('event_id', eventId)
      .order('at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  },
};
