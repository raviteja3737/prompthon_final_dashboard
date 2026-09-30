import { supabase } from '../lib/supabaseClient';
import type { UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'ravitejaraviteja900@gmail.com';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut(scope: 'local' | 'global' = 'local') {
    await supabase.auth.signOut({ scope });
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getRole(currentUser?: { id: string; email?: string | null; app_metadata?: Record<string, unknown> } | null): Promise<UserRole> {
    const user = currentUser ?? (await supabase.auth.getUser()).data.user;
    if (!user) return 'public';

    // 1. Direct check for super admin email
    if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return 'platform_admin';
    }

    // 2. Check if super admin in platform_admins
    const { data: adminRow } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminRow) return 'platform_admin';

    // 3. Check event member role
    const { data: memberRow } = await supabase
      .from('event_members')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberRow?.role === 'organizer') return 'organizer';
    if (memberRow?.role === 'jury') return 'jury';

    // 4. Fallback check on app_metadata
    const metaRole = (user as { app_metadata?: { role?: string } }).app_metadata?.role;
    if (metaRole === 'admin') return 'platform_admin';
    if (metaRole === 'organizer') return 'organizer';
    if (metaRole === 'jury') return 'jury';

    return 'public';
  },

  async getEventContext(currentUser?: { id: string } | null): Promise<{ eventId: string; slug: string } | null> {
    const user = currentUser ?? (await supabase.auth.getUser()).data.user;
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
