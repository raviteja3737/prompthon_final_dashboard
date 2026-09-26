import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rfzoryifrccrgzdectca.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmem9yeWlmcmNjcmd6ZGVjdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjM0MzUsImV4cCI6MjEwNTk5OTQzNX0.sMBRhvmQqqMK1Y-uWfLqjJ4UpwefZX8VKupQZxXIPu4';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here');
};

// Create a singleton client. If keys are missing, we still export an instance or dummy client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
