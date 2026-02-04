import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lbzjnhlribtfwnoydpdv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiempuaGxyaWJ0Zndub3lkcGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg2MDksImV4cCI6MjA4NTY1NDYwOX0.I_d7hzeHdi82osxF0Y90SQq41ilguENbK5bMkNSvbGU';

// Using any type to avoid strict typing issues with Supabase client
// The actual types are defined in src/types/database.ts for reference
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to get current session
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
