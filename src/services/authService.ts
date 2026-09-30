import { supabase } from '../lib/supabaseClient';
import type { UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'ravitejaraviteja900@gmail.com';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getRole(): Promise<UserRole> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'public';

    // Check if super admin
    const { data: adminRow } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminRow) return 'platform_admin';

    // Check event member role
    const { data: memberRow } = await supabase
      .from('event_members')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberRow?.role === 'organizer') return 'organizer';
    if (memberRow?.role === 'jury') return 'jury';

    return 'public';
  },

  async getEventContext(): Promise<{ eventId: string; slug: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('event_members')
      .select('event_id, events(slug)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const ev = data as unknown as { event_id: string; events: { slug: string } | null };
    return { eventId: ev.event_id, slug: ev.events?.slug ?? '' };
  },

  onAuthStateChange(callback: () => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
