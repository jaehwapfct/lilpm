import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Reply, MoreHorizontal } from 'lucide-react';
import type { BlockComment, BlockCommentReply } from './extensions/BlockComment';

interface CommentPanelProps {
    isOpen: boolean;
    onClose: () => void;
    blockId: string | null;
    comments: BlockComment[];
    currentUser: {
        id: string;
        name: string;
        avatar?: string;
    };
    onAddComment: (blockId: string, content: string) => Promise<void>;
    onResolveComment: (commentId: string) => Promise<void>;
    onAddReply: (commentId: string, content: string) => Promise<void>;
}

export function CommentPanel({
    isOpen,
    onClose,
    blockId,
    comments,
    currentUser,
    onAddComment,
    onResolveComment,
    onAddReply,
}: CommentPanelProps) {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

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

    const filteredComments = blockId
        ? comments.filter(c => c.blockId === blockId)
        : comments;

    return (
        <div className={`comment-panel ${isOpen ? 'open' : ''}`}>
            {/* Header */}
            <div className="comment-panel-header">
                <h3 className="comment-panel-title">
                    Comments {filteredComments.length > 0 && `(${filteredComments.length})`}
                </h3>
                <button className="comment-panel-close" onClick={onClose}>
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Comments List */}
            <div className="comment-panel-content">
                {filteredComments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">No comments yet</p>
                        <p className="text-xs mt-1">Be the first to add a comment</p>
                    </div>
                ) : (
                    filteredComments.map((comment) => (
                        <div
                            key={comment.id}
                            className={`comment-item ${comment.resolved ? 'comment-resolved' : ''}`}
                        >
                            {/* Comment Header */}
                            <div className="comment-header">
                                <div className="comment-avatar">
                                    {comment.authorAvatar ? (
                                        <img src={comment.authorAvatar} alt={comment.authorName} />
                                    ) : (
                                        comment.authorName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="comment-meta">
                                    <div className="comment-author">{comment.authorName}</div>
                                    <div className="comment-time">{formatTime(comment.createdAt)}</div>
                                </div>
                            </div>

                            {/* Comment Content */}
                            <div className="comment-content">{comment.content}</div>

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
                                </div>
                            )}

                            {/* Replies */}
                            {comment.replies.length > 0 && (
                                <div className="comment-replies">
                                    {comment.replies.map((reply) => (
                                        <div key={reply.id} className="reply-item">
                                            <div className="comment-header">
                                                <div className="comment-avatar" style={{ width: 20, height: 20, fontSize: 9 }}>
                                                    {reply.authorName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="comment-meta">
                                                    <div className="comment-author" style={{ fontSize: 12 }}>{reply.authorName}</div>
                                                    <div className="comment-time">{formatTime(reply.createdAt)}</div>
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
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            className="comment-submit-btn"
                                            style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => handleSubmitReply(comment.id)}
                                            disabled={isSubmitting || !replyContent.trim()}
                                        >
                                            Reply
                                        </button>
                                        <button
                                            className="comment-action-btn"
                                            onClick={() => {
                                                setReplyingTo(null);
                                                setReplyContent('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Input */}
            <div className="comment-input-container">
                <textarea
                    ref={inputRef}
                    className="comment-input"
                    placeholder="Add a comment... (Cmd+Shift+M)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
        </div>
    );
}

export default CommentPanel;
