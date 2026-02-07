import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

// ============================================
// PROFILE SERVICES
// ============================================

export const profileService = {
    async getProfile(userId: string): Promise<Profile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data as Profile | null;
    },

    async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates as any)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    },
};
