import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const mapSupabaseUser = (supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; created_at?: string }): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: (supabaseUser.user_metadata?.name as string) || supabaseUser.email?.split('@')[0] || '',
  avatarUrl: supabaseUser.user_metadata?.avatar_url as string | undefined,
  role: 'member',
  createdAt: supabaseUser.created_at || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ isLoading: false });
          throw new Error(error.message);
        }

        if (data.user) {
          set({
            user: mapSupabaseUser(data.user),
            isAuthenticated: true,
            isLoading: false,
          });
        }
      },

      signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true });

        // Use environment variable for production URL, fallback to current origin
        // This ensures email confirmation links work correctly in production
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const redirectUrl = `${siteUrl}/`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          set({ isLoading: false });
          throw new Error(error.message);
        }

        if (data.user) {
          const user = mapSupabaseUser(data.user);
          user.name = name; // Ensure name is set from signup form
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      loadUser: async () => {
        // Don't set loading if we're already loading to avoid flicker
        const currentState = get();
        if (!currentState.isLoading) {
          set({ isLoading: true });
        }

        try {
          // Set up auth state listener (only once)
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
              set({
                user: mapSupabaseUser(session.user),
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          });

          // Get initial session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({
              user: mapSupabaseUser(session.user),
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ 
              user: null,
              isAuthenticated: false,
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          // Always set loading to false on error
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false 
          });
        }
      },

      updateUser: (data: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
