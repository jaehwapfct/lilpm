/**
 * Block Comment Service
 * 
 * Handles inline comments on blocks within PRD and Issue editors.
 * Supports comments, replies, reactions, and resolution.
 */

import { supabase } from '@/lib/supabase';
import type { BlockComment, BlockCommentReply, BlockCommentReaction, BlockCommentPageType } from '@/types/database';

// ─── Comments ───────────────────────────────────────────────────────────────

export async function getComments(pageId: string, pageType: BlockCommentPageType): Promise<BlockComment[]> {
    const { data, error } = await supabase
        .from('block_comments')
        .select(`
            *,
            user:profiles!block_comments_user_id_fkey(*),
            replies:block_comment_replies(
                *,
                user:profiles!block_comment_replies_user_id_fkey(*)
            ),
            reactions:block_comment_reactions(
                *,
                user:profiles!block_comment_reactions_user_id_fkey(*)
            )
        `)
        .eq('page_id', pageId)
        .eq('page_type', pageType)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch block comments:', error);
        throw error;
    }

    return (data || []) as unknown as BlockComment[];
}

export async function getCommentsByBlock(pageId: string, pageType: BlockCommentPageType, blockId: string): Promise<BlockComment[]> {
    const { data, error } = await supabase
        .from('block_comments')
        .select(`
            *,
            user:profiles!block_comments_user_id_fkey(*),
            replies:block_comment_replies(
                *,
                user:profiles!block_comment_replies_user_id_fkey(*)
            ),
            reactions:block_comment_reactions(
                *,
                user:profiles!block_comment_reactions_user_id_fkey(*)
            )
        `)
        .eq('page_id', pageId)
        .eq('page_type', pageType)
        .eq('block_id', blockId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as BlockComment[];
}

export async function addComment(
    pageId: string,
    pageType: BlockCommentPageType,
    blockId: string,
    content: string,
): Promise<BlockComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('block_comments')
        .insert({
            page_id: pageId,
            page_type: pageType,
            block_id: blockId,
            user_id: user.id,
            content,
        })
        .select(`
            *,
            user:profiles!block_comments_user_id_fkey(*)
        `)
        .single();

    if (error) throw error;
    return { ...data, replies: [], reactions: [] } as unknown as BlockComment;
}

export async function resolveComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('block_comments')
        .update({
            resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId);

    if (error) throw error;
}

export async function unresolveComment(commentId: string): Promise<void> {
    const { error } = await supabase
        .from('block_comments')
        .update({
            resolved: false,
            resolved_by: null,
            resolved_at: null,
        })
        .eq('id', commentId);

    if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
        .from('block_comments')
        .delete()
        .eq('id', commentId);

    if (error) throw error;
}

// ─── Replies ────────────────────────────────────────────────────────────────

export async function addReply(commentId: string, content: string): Promise<BlockCommentReply> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('block_comment_replies')
        .insert({
            comment_id: commentId,
            user_id: user.id,
            content,
        })
        .select(`
            *,
            user:profiles!block_comment_replies_user_id_fkey(*)
        `)
        .single();

    if (error) throw error;
    return data as unknown as BlockCommentReply;
}

export async function deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase
        .from('block_comment_replies')
        .delete()
        .eq('id', replyId);

    if (error) throw error;
}

// ─── Reactions ──────────────────────────────────────────────────────────────

export async function toggleReaction(commentId: string, emoji: string): Promise<{ added: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if reaction already exists
    const { data: existing } = await supabase
        .from('block_comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

    if (existing) {
        // Remove existing reaction
        const { error } = await supabase
            .from('block_comment_reactions')
            .delete()
            .eq('id', existing.id);

        if (error) throw error;
        return { added: false };
    } else {
        // Add new reaction
        const { error } = await supabase
            .from('block_comment_reactions')
            .insert({
                comment_id: commentId,
                user_id: user.id,
                emoji,
            });

        if (error) throw error;
        return { added: true };
    }
}

// ─── Real-time Subscription ────────────────────────────────────────────────

export function subscribeToComments(
    pageId: string,
    pageType: BlockCommentPageType,
    onUpdate: () => void,
) {
    const channel = supabase
        .channel(`block_comments:${pageType}:${pageId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'block_comments',
            filter: `page_id=eq.${pageId}`,
        }, onUpdate)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'block_comment_replies',
        }, onUpdate)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'block_comment_reactions',
        }, onUpdate)
        .subscribe();

    return () => {
        channel.unsubscribe();
    };
}

// ─── Export as namespace ────────────────────────────────────────────────────

export const blockCommentService = {
    getComments,
    getCommentsByBlock,
    addComment,
    resolveComment,
    unresolveComment,
    deleteComment,
    addReply,
    deleteReply,
    toggleReaction,
    subscribeToComments,
};
