// Issue comments and activities management hook
import { useState, useCallback } from 'react';
import { commentService, activityService } from '@/lib/services';
import { toast } from 'sonner';
import type { CommentWithUser, ActivityWithUser } from '@/types/database';

export interface UseIssueCommentsReturn {
    comments: CommentWithUser[];
    activities: ActivityWithUser[];
    newComment: string;
    isSendingComment: boolean;

    setNewComment: (comment: string) => void;
    loadCommentsAndActivities: () => Promise<void>;
    handleSendComment: () => Promise<void>;
    handleDeleteComment: (commentId: string) => Promise<void>;
}

export function useIssueComments(
    issueId: string | undefined,
    t: (key: string) => string
): UseIssueCommentsReturn {
    const [comments, setComments] = useState<CommentWithUser[]>([]);
    const [activities, setActivities] = useState<ActivityWithUser[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);

    const loadCommentsAndActivities = useCallback(async () => {
        if (!issueId) return;

        try {
            const [commentsData, activitiesData] = await Promise.all([
                commentService.getComments(issueId),
                activityService.getActivities(issueId),
            ]);
            setComments(commentsData);
            setActivities(activitiesData);
        } catch (error) {
            console.error('Failed to load comments/activities:', error);
        }
    }, [issueId]);

    const handleSendComment = useCallback(async () => {
        if (!issueId || !newComment.trim()) return;

        setIsSendingComment(true);
        try {
            await commentService.createComment(issueId, newComment.trim());
            setNewComment('');
            loadCommentsAndActivities();
            toast.success(t('issues.commentAdded'));
        } catch (error) {
            toast.error(t('issues.commentError'));
        } finally {
            setIsSendingComment(false);
        }
    }, [issueId, newComment, loadCommentsAndActivities, t]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        try {
            await commentService.deleteComment(commentId);
            loadCommentsAndActivities();
            toast.success(t('issues.commentDeleted'));
        } catch (error) {
            toast.error(t('issues.deleteCommentError'));
        }
    }, [loadCommentsAndActivities, t]);

    return {
        comments,
        activities,
        newComment,
        isSendingComment,
        setNewComment,
        loadCommentsAndActivities,
        handleSendComment,
        handleDeleteComment,
    };
}
