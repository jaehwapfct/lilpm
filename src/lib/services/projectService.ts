import { supabase } from '@/lib/supabase';
import type { Project, ProjectStatus } from '@/types/database';

export const projectService = {
  async getProjects(teamId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Project[];
  },

  async getProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data as Project | null;
  },

  async createProject(
    teamId: string,
    projectData: {
      name: string;
      slug?: string;
      description?: string;
      color?: string;
      icon?: string;
      lead_id?: string;
      start_date?: string;
      target_date?: string;
    }
  ): Promise<Project> {
    const slug = projectData.slug || projectData.name.toLowerCase().replace(/\s+/g, '-');
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        team_id: teamId,
        name: projectData.name,
        slug,
        description: projectData.description,
        color: projectData.color || '#6366F1',
        icon: projectData.icon,
        lead_id: projectData.lead_id,
        start_date: projectData.start_date,
        target_date: projectData.target_date,
        status: 'planned' as ProjectStatus,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates as any)
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Project;
  },

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
  },
};
