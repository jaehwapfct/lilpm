import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Reply, SmilePlus, Trash2, RotateCcw } from 'lucide-react';
import type { BlockComment, BlockCommentReply, BlockCommentReaction } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';

// Common reaction emojis
const REACTION_EMOJIS = ['👍', '👎', '❤️', '🎉', '😄', '🤔', '👀', '🚀'];

interface CommentPanelProps {
    isOpen: boolean;
    onClose: () => void;
    blockId: string | null;
    comments: BlockComment[];
    onAddComment: (blockId: string, content: string) => Promise<void>;
    onResolveComment: (commentId: string) => Promise<void>;
    onUnresolveComment?: (commentId: string) => Promise<void>;
    onDeleteComment?: (commentId: string) => Promise<void>;
    onAddReply: (commentId: string, content: string) => Promise<void>;
    onToggleReaction?: (commentId: string, emoji: string) => Promise<void>;
}

export function CommentPanel({
    isOpen,
    onClose,
    blockId,
    comments,
    onAddComment,
    onResolveComment,
    onUnresolveComment,
    onDeleteComment,
    onAddReply,
    onToggleReaction,
}: CommentPanelProps) {
    const { user } = useAuthStore();
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, blockId]);

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !blockId) return;
        setIsSubmitting(true);
        try {
            await onAddComment(blockId, newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitReply = async (commentId: string) => {
        if (!replyContent.trim()) return;
        setIsSubmitting(true);
        try {
            await onAddReply(commentId, replyContent.trim());
            setReplyContent('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to add reply:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReaction = async (commentId: string, emoji: string) => {
        setShowEmojiPicker(null);
        try {
            await onToggleReaction?.(commentId, emoji);
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    // Group reactions by emoji with counts
    const groupReactions = (reactions: BlockCommentReaction[] = []) => {
        const grouped = new Map<string, { count: number; hasOwn: boolean; users: string[] }>();
        reactions.forEach((r) => {
            const existing = grouped.get(r.emoji) || { count: 0, hasOwn: false, users: [] };
            existing.count++;
            if (r.user_id === user?.id) existing.hasOwn = true;
            existing.users.push(r.user?.name || 'User');
            grouped.set(r.emoji, existing);
        });
        return grouped;
    };

    const filteredComments = blockId
        ? comments.filter(c => c.blockId === blockId)
        : comments;

    // Sort: unresolved first, then by date
    const sortedComments = [...filteredComments].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return (
        <div className={`comment-panel ${isOpen ? 'open' : ''}`}>
            {/* Header */}
            <div className="comment-panel-header">
                <h3 className="comment-panel-title">
                    Comments {sortedComments.length > 0 && `(${sortedComments.length})`}
                </h3>
                <button className="comment-panel-close" onClick={onClose}>
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Comments List */}
            <div className="comment-panel-content">
                {sortedComments.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <p className="text-sm">No comments yet</p>
                        <p className="text-xs mt-1">Be the first to add a comment</p>
                        <p className="text-[10px] mt-2 text-slate-500">⌘+Shift+M to comment on a block</p>
                    </div>
                ) : (
                    sortedComments.map((comment) => {
                        const reactions = groupReactions(comment.reactions);

                        return (
                            <div
                                key={comment.id}
                                className={`comment-item ${comment.resolved ? 'comment-resolved' : ''}`}
                            >
                                {/* Comment Header */}
                                <div className="comment-header">
                                    <div className="comment-avatar">
                                        {comment.user?.avatar_url ? (
                                            <img src={comment.user.avatar_url} alt={comment.user?.name || ''} className="w-full h-full rounded-full" />
                                        ) : (
                                            (comment.user?.name || 'U').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="comment-meta">
                                        <div className="comment-author">{comment.user?.name || 'User'}</div>
                                        <div className="comment-time">{formatTime(comment.created_at)}</div>
                                    </div>
                                </div>

                                {/* Comment Content */}
                                <div className="comment-content">{comment.content}</div>

                                {/* Reactions */}
                                {(reactions.size > 0 || onToggleReaction) && (
                                    <div className="comment-reactions">
                                        {Array.from(reactions.entries()).map(([emoji, info]) => (
                                            <button
                                                key={emoji}
                                                className={`comment-reaction-btn ${info.hasOwn ? 'active' : ''}`}
                                                onClick={() => handleReaction(comment.id, emoji)}
                                                title={info.users.join(', ')}
                                            >
                                                <span>{emoji}</span>
                                                <span className="reaction-count">{info.count}</span>
                                            </button>
                                        ))}
                                        {onToggleReaction && !comment.resolved && (
                                            <div className="relative">
                                                <button
                                                    className="comment-add-reaction"
                                                    onClick={() => setShowEmojiPicker(
                                                        showEmojiPicker === comment.id ? null : comment.id
                                                    )}
                                                >
                                                    <SmilePlus className="h-3.5 w-3.5" />
                                                </button>
                                                {showEmojiPicker === comment.id && (
                                                    <div className="absolute bottom-full left-0 mb-1 bg-[#1a1a1f] border border-white/10 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                                                        {REACTION_EMOJIS.map((emoji) => (
                                                            <button
                                                                key={emoji}
                                                                className="hover:bg-white/10 rounded p-1 text-base transition-transform hover:scale-110"
                                                                onClick={() => handleReaction(comment.id, emoji)}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                {!comment.resolved && (
                                    <div className="comment-actions">
                                        <button
                                            className="comment-action-btn"
                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                        >
                                            <Reply className="h-3 w-3 inline mr-1" />
                                            Reply
                                        </button>
                                        <button
                                            className="comment-action-btn"
                                            onClick={() => onResolveComment(comment.id)}
                                        >
                                            <Check className="h-3 w-3 inline mr-1" />
                                            Resolve
                                        </button>
                                        {onDeleteComment && comment.user_id === user?.id && (
                                            <button
                                                className="comment-action-btn text-red-400 hover:text-red-300"
                                                onClick={() => onDeleteComment(comment.id)}
                                            >
                                                <Trash2 className="h-3 w-3 inline mr-1" />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Resolved badge + unresolve */}
                                {comment.resolved && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            Resolved
                                        </span>
                                        {onUnresolveComment && (
                                            <button
                                                className="comment-action-btn"
                                                onClick={() => onUnresolveComment(comment.id)}
                                            >
                                                <RotateCcw className="h-3 w-3 inline mr-0.5" />
                                                Reopen
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="comment-replies">
                                        {comment.replies.map((reply) => (
                                            <div key={reply.id} className="reply-item">
                                                <div className="comment-header">
                                                    <div className="comment-avatar" style={{ width: 20, height: 20, fontSize: 9 }}>
                                                        {(reply.user?.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="comment-meta">
                                                        <div className="comment-author" style={{ fontSize: 12 }}>
                                                            {reply.user?.name || 'User'}
                                                        </div>
                                                        <div className="comment-time">{formatTime(reply.created_at)}</div>
                                                    </div>
                                                </div>
                                                <div className="comment-content" style={{ fontSize: 12 }}>{reply.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Reply Input */}
                                {replyingTo === comment.id && (
                                    <div className="mt-3">
                                        <textarea
                                            className="comment-input"
                                            style={{ minHeight: 60 }}
                                            placeholder="Write a reply..."
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    handleSubmitReply(comment.id);
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                className="comment-submit-btn"
                                                style={{ padding: '6px 12px', fontSize: 12, marginTop: 0 }}
                                                onClick={() => handleSubmitReply(comment.id)}
                                                disabled={isSubmitting || !replyContent.trim()}
                                            >
                                                Reply
                                            </button>
                                            <button
                                                className="comment-action-btn"
                                                onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Comment Input */}
            {blockId && (
                <div className="comment-input-container">
                    <textarea
                        ref={inputRef}
                        className="comment-input"
                        placeholder="Add a comment... (⌘+Enter to submit)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleSubmitComment();
                            }
                        }}
                    />
                    <button
                        className="comment-submit-btn"
                        onClick={handleSubmitComment}
                        disabled={isSubmitting || !newComment.trim()}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Comment'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default CommentPanel;
