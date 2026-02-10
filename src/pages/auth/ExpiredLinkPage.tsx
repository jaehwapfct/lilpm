import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExpiredLinkPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d0d0f] px-4">
            <div className="w-full max-w-sm space-y-8 text-center">
                {/* Icon */}
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 mb-4">
                    <Clock className="h-8 w-8 text-amber-500" />
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">{t('auth.linkExpired', 'Link expired')}</h1>
                    <p className="text-slate-400">
                        {t('auth.linkExpiredDesc', 'This password reset link has expired. Reset links are valid for 30 minutes.')}
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                    <Link to="/forgot-password" className="block">
                        <Button className="w-full gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {t('auth.requestNewLink', 'Request a new link')}
                        </Button>
                    </Link>
                    <Link to="/login" className="block">
                        <Button variant="ghost" className="w-full gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t('auth.backToLogin', 'Back to login')}
                        </Button>
                    </Link>
                </div>

                {/* Help text */}
                <p className="text-xs text-slate-400">
                    {t('auth.linkExpiredHelp', 'If you continue having issues, please contact support.')}
                </p>
            </div>
        </div>
    );
}
