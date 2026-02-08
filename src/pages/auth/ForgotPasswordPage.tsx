import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
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

export function ForgotPasswordPage() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');

    const schema = z.object({
        email: z.string().email(t('auth.invalidEmail')),
    });

    type FormData = z.infer<typeof schema>;

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                throw error;
            }

            setSentEmail(data.email);
            setIsEmailSent(true);
            toast.success(t('auth.resetEmailSent', 'Reset email sent'));
        } catch (error: any) {
            toast.error(error.message || t('auth.resetEmailError', 'Failed to send reset email'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isEmailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm space-y-8 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-semibold">{t('auth.checkYourEmail', 'Check your email')}</h1>
                    <p className="text-muted-foreground">
                        {t('auth.resetEmailSentTo', "We've sent a password reset link to")}
                        <br />
                        <span className="font-medium text-foreground">{sentEmail}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t('auth.resetLinkExpiry', 'The link will expire in 30 minutes.')}
                    </p>
                    <div className="pt-4 space-y-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setIsEmailSent(false);
                                form.reset();
                            }}
                        >
                            {t('auth.tryDifferentEmail', 'Try a different email')}
                        </Button>
                        <Link to="/login" className="block">
                            <Button variant="ghost" className="w-full gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                {t('auth.backToLogin', 'Back to login')}
                            </Button>
                        </Link>
                    </div>
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
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold">{t('auth.forgotPassword', 'Forgot password?')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('auth.forgotPasswordDesc', "Enter your email and we'll send you a reset link")}
                    </p>
                </div>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.email')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="name@company.com"
                                            autoComplete="email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('common.sending', 'Sending...')}
                                </>
                            ) : (
                                t('auth.sendResetLink', 'Send reset link')
                            )}
                        </Button>
                    </form>
                </Form>

                {/* Back to login */}
                <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.backToLogin', 'Back to login')}
                </Link>
            </div>
        </div>
    );
}
