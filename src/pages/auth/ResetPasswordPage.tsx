import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ResetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

    // Check if user has a valid reset session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            // Check URL for error parameters (expired link)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const error = hashParams.get('error');
            const errorDescription = hashParams.get('error_description');

            if (error || errorDescription?.includes('expired')) {
                navigate('/reset-password/expired');
                return;
            }

            // If there's a valid session from the reset link
            if (session) {
                setIsValidSession(true);
            } else {
                // Try to get session from URL hash (Supabase redirects with tokens)
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        navigate('/reset-password/expired');
                        return;
                    }
                    setIsValidSession(true);
                } else {
                    // No valid session and no tokens - link might be expired or invalid
                    navigate('/reset-password/expired');
                }
            }
        };

        checkSession();
    }, [navigate]);

    const schema = z.object({
        password: z
            .string()
            .min(8, t('auth.passwordMinLength', 'Password must be at least 8 characters'))
            .regex(/[A-Z]/, t('auth.passwordUppercase', 'Password must contain at least one uppercase letter'))
            .regex(/[a-z]/, t('auth.passwordLowercase', 'Password must contain at least one lowercase letter'))
            .regex(/[0-9]/, t('auth.passwordNumber', 'Password must contain at least one number')),
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t('auth.passwordsDoNotMatch', "Passwords don't match"),
        path: ['confirmPassword'],
    });

    type FormData = z.infer<typeof schema>;

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                throw error;
            }

            setIsSuccess(true);
            toast.success(t('auth.passwordResetSuccess', 'Password reset successfully'));

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            if (error.message?.includes('expired')) {
                navigate('/reset-password/expired');
            } else {
                toast.error(error.message || t('auth.passwordResetError', 'Failed to reset password'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isValidSession === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm space-y-8 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-semibold">{t('auth.passwordReset', 'Password reset!')}</h1>
                    <p className="text-muted-foreground">
                        {t('auth.passwordResetSuccessDesc', 'Your password has been reset successfully. You will be redirected to login.')}
                    </p>
                    <Link to="/login">
                        <Button className="w-full">{t('auth.login', 'Log in')}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold">{t('auth.resetPassword', 'Reset password')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('auth.resetPasswordDesc', 'Enter your new password below')}
                    </p>
                </div>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.newPassword', 'New password')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.confirmPassword', 'Confirm password')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Password requirements */}
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>{t('auth.passwordRequirements', 'Password must:')}</p>
                            <ul className="list-disc list-inside pl-2 space-y-0.5">
                                <li>{t('auth.min8chars', 'Be at least 8 characters')}</li>
                                <li>{t('auth.hasUppercase', 'Contain an uppercase letter')}</li>
                                <li>{t('auth.hasLowercase', 'Contain a lowercase letter')}</li>
                                <li>{t('auth.hasNumber', 'Contain a number')}</li>
                            </ul>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('common.resetting', 'Resetting...')}
                                </>
                            ) : (
                                t('auth.resetPassword', 'Reset password')
                            )}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
