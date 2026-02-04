import { supabase } from '@/lib/supabase';
import type { Cycle, CycleStatus, Issue } from '@/types/database';

export const cycleService = {
  async getCycles(teamId: string): Promise<Cycle[]> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Cycle[];
  },

  async getCycle(cycleId: string): Promise<Cycle | null> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('id', cycleId)
      .single();
    
    if (error) throw error;
    return data as Cycle | null;
  },

  async getActiveCycle(teamId: string): Promise<Cycle | null> {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as Cycle | null;
  },

  async createCycle(
    teamId: string,
    cycleData: {
      name: string;
      number: number;
      description?: string;
      start_date: string;
      end_date: string;
    }
  ): Promise<Cycle> {
    const { data, error } = await supabase
      .from('cycles')
      .insert({
        team_id: teamId,
        name: cycleData.name,
        number: cycleData.number,
        description: cycleData.description,
        start_date: cycleData.start_date,
        end_date: cycleData.end_date,
        status: 'upcoming' as CycleStatus,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as Cycle;
  },

  async updateCycle(cycleId: string, updates: Partial<Cycle>): Promise<Cycle> {
    const { data, error } = await supabase
      .from('cycles')
      .update(updates as any)
      .eq('id', cycleId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Cycle;
  },

  async deleteCycle(cycleId: string): Promise<void> {
    const { error } = await supabase
      .from('cycles')
      .delete()
      .eq('id', cycleId);
    
    if (error) throw error;
  },

  async startCycle(cycleId: string): Promise<Cycle> {
    return this.updateCycle(cycleId, { status: 'active' });
  },

  async completeCycle(cycleId: string): Promise<Cycle> {
    return this.updateCycle(cycleId, { status: 'completed' });
  },

  async getCycleIssues(cycleId: string): Promise<Issue[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return (data || []) as Issue[];
  },

  async addIssueToCycle(issueId: string, cycleId: string): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .update({ cycle_id: cycleId } as any)
      .eq('id', issueId);
    
    if (error) throw error;
  },

  async removeIssueFromCycle(issueId: string): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .update({ cycle_id: null } as any)
      .eq('id', issueId);
    
    if (error) throw error;
  },

  async getNextCycleNumber(teamId: string): Promise<number> {
    const { data, error } = await supabase
      .from('cycles')
      .select('number')
      .eq('team_id', teamId)
      .order('number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return ((data?.[0] as Cycle | undefined)?.number || 0) + 1;
  },
};
