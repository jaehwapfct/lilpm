import { supabase } from '@/lib/supabase';
import type { Comment, Profile } from '@/types/database';
import { issueActivityService } from './issueActivityService';

// ============================================
// COMMENT SERVICES
// ============================================

export interface CommentWithUser extends Comment {
    user: Profile;
}

export const commentService = {
    async getComments(issueId: string): Promise<CommentWithUser[]> {
        const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select('*')
            .eq('issue_id', issueId)
            .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        if (!commentsData || commentsData.length === 0) return [];

        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];

        const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        return commentsData.map(comment => ({
            ...comment,
            user: profilesMap.get(comment.user_id) || null,
        })) as unknown as CommentWithUser[];
    },

    async createComment(issueId: string, body: string): Promise<Comment> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('comments')
            .insert({
                issue_id: issueId,
                user_id: user.id,
                body,
            } as any)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create comment');

        await issueActivityService.createActivity(issueId, 'comment_added', { comment_id: (data as Comment).id });

        return data as Comment;
    },

    async updateComment(commentId: string, body: string): Promise<Comment> {
        const { data, error } = await supabase
            .from('comments')
            .update({ body } as any)
            .eq('id', commentId)
            .select()
            .single();

        if (error) throw error;
        return data as Comment;
    },

    async deleteComment(commentId: string): Promise<void> {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;
    },
};
