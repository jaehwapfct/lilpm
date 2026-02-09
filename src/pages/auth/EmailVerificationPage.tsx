import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function EmailVerificationPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isEmailVerified, resendVerificationEmail, logout } = useAuthStore();
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Get returnUrl from query params (e.g., for team invite flow)
    const returnUrl = searchParams.get('returnUrl');

    // If email is verified, redirect to returnUrl or onboarding
    useEffect(() => {
        if (isEmailVerified) {
            // If there's a returnUrl (e.g., invite acceptance), go there
            // Otherwise, go to team creation for new users
            const redirectTo = returnUrl || '/onboarding/create-team';
            navigate(redirectTo, { replace: true });
        }
    }, [isEmailVerified, navigate, returnUrl]);

    // Poll for email verification every 3 seconds
    // This detects when user verifies email in another tab
    useEffect(() => {
        const checkEmailVerification = async () => {
            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser?.email_confirmed_at) {
                    // Email is verified! Refresh the auth session to update store
                    await supabase.auth.refreshSession();
                    // The authStore's onAuthStateChange listener will handle the update
                }
            } catch (error) {
                console.error('Error checking email verification:', error);
            }
        };

        // Start polling
        pollingRef.current = setInterval(checkEmailVerification, 3000);

        // Also check immediately on mount
        checkEmailVerification();

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const handleResend = async () => {
        setIsResending(true);
        setResendSuccess(false);
        try {
            await resendVerificationEmail();
            setResendSuccess(true);
            toast.success(t('auth.verificationEmailSent', '인증 이메일을 다시 보냈습니다'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('auth.resendError', '이메일 재전송에 실패했습니다'));
        } finally {
            setIsResending(false);
        }
    };

    const handleLogout = async () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 text-center">
                {/* Icon */}
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mx-auto">
                    <Mail className="h-10 w-10 text-primary" />
                </div>

                {/* Title */}
                <div>
                    <h1 className="text-2xl font-semibold">
                        {t('auth.verifyEmail', 'Verify your email')}
                    </h1>
                    <p className="text-muted-foreground mt-3 leading-relaxed">
                        {t('auth.verificationInstructions', 'We sent a verification link to:')}
                    </p>
                    <p className="text-lg font-medium mt-2 text-primary">
                        {user?.email}
                    </p>
                </div>

                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                    <p>{t('auth.checkInbox', 'Check your inbox and click the verification link.')}</p>
                    <p>{t('auth.checkSpam', "If you don't see the email, check your spam folder.")}</p>
                </div>

                {/* Resend Button */}
                <div className="space-y-3">
                    {resendSuccess ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span>{t('auth.emailSent', 'Email sent successfully')}</span>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleResend}
                            disabled={isResending}
                        >
                            {isResending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('auth.sending', 'Sending...')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" />
                                    {t('auth.resendEmail', 'Resend verification email')}
                                </>
                            )}
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={handleLogout}
                    >
                        {t('auth.useAnotherEmail', 'Sign up with a different email')}
                    </Button>
                </div>

                {/* Help text */}
                <p className="text-xs text-muted-foreground">
                    {t('auth.verificationHelp', 'Once verified, you will be redirected automatically.')}
                </p>
            </div>
        </div>
    );
}

