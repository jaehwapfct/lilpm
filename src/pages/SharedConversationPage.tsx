import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, MessageSquare, User, Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface SharedConversation {
    conversationId: string;
    title: string;
    accessType: 'view' | 'edit';
    isPublic: boolean;
    sharedByName: string;
    expiresAt: string | null;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export function SharedConversationPage() {
    const { token } = useParams<{ token: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sharedConv, setSharedConv] = useState<SharedConversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [accessRequested, setAccessRequested] = useState(false);
    const [requestMessage, setRequestMessage] = useState('');
    const [requestLoading, setRequestLoading] = useState(false);

    useEffect(() => {
        if (token) {
            loadSharedConversation();
        }
    }, [token]);

    const loadSharedConversation = async () => {
        try {
            // Get share info using RPC function
            const { data, error: rpcError } = await supabase
                .rpc('get_shared_conversation', { p_token: token });

            if (rpcError) throw rpcError;
            if (!data || data.length === 0) {
                setError('Link expired or not found');
                return;
            }

            const shareData = data[0];
            setSharedConv({
                conversationId: shareData.conversation_id,
                title: shareData.title,
                accessType: shareData.access_type,
                isPublic: shareData.is_public,
                sharedByName: shareData.shared_by_name,
                expiresAt: shareData.expires_at,
            });

            // If public or user has access, load messages
            if (shareData.is_public || isAuthenticated) {
                await loadMessages(shareData.conversation_id);
            }
        } catch (err) {
            console.error('Failed to load shared conversation:', err);
            setError('Failed to load shared conversation');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const { data, error } = await supabase
                .from('lily_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const requestAccess = async () => {
        if (!isAuthenticated) {
            navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        setRequestLoading(true);
        try {
            // Get share ID first
            const { data: shareData } = await supabase
                .from('conversation_shares')
                .select('id, conversation_id')
                .eq('share_token', token)
                .single();

            if (!shareData) throw new Error('Share not found');

            // Create access request
            const { error } = await supabase
                .from('conversation_access_requests')
                .insert({
                    conversation_id: shareData.conversation_id,
                    share_id: shareData.id,
                    requested_by: user?.id,
                    message: requestMessage,
                });

            if (error) throw error;
            setAccessRequested(true);
        } catch (err) {
            console.error('Failed to request access:', err);
        } finally {
            setRequestLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
                </div>
            </div>
        );
    }

    if (error || !sharedConv) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle>{t('lily.linkNotFound', 'Link Not Found')}</CardTitle>
                        <CardDescription>
                            {t('lily.linkExpiredOrInvalid', 'This link has expired or is invalid.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/')} className="w-full">
                            {t('common.goHome', 'Go Home')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Need to request access for private conversations
    if (!sharedConv.isPublic && !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{t('lily.privateConversation', 'Private Conversation')}</CardTitle>
                        <CardDescription>
                            {sharedConv.sharedByName} {t('lily.sharedWith', 'shared this conversation')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {accessRequested ? (
                            <div className="text-center py-4">
                                <p className="text-green-600 font-medium">
                                    {t('lily.accessRequested', 'Access request sent!')}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('lily.waitingForApproval', 'Waiting for approval from the owner.')}
                                </p>
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder={t('lily.requestMessage', 'Add a message (optional)')}
                                    value={requestMessage}
                                    onChange={(e) => setRequestMessage(e.target.value)}
                                />
                                <Button
                                    onClick={requestAccess}
                                    disabled={requestLoading}
                                    className="w-full"
                                >
                                    {requestLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    {t('lily.requestAccess', 'Request Access')}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="font-medium">{sharedConv.title || t('lily.untitledConversation', 'Untitled')}</h1>
                        <p className="text-xs text-muted-foreground">
                            {t('lily.sharedBy', 'Shared by')} {sharedConv.sharedByName}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                    {t('common.goHome', 'Go Home')}
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                        >
                            {message.role === 'assistant' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        <Bot className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`rounded-lg px-4 py-2 max-w-[80%] ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                        <User className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
