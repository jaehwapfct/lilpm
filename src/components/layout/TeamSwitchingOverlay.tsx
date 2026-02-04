import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface TeamSwitchingOverlayProps {
  isVisible: boolean;
  teamName: string;
}

export function TeamSwitchingOverlay({ isVisible, teamName }: TeamSwitchingOverlayProps) {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Team icon animation */}
        <div className="relative">
          <div 
            className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold animate-pulse"
            style={{ 
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))'
            }}
          >
            {teamName?.charAt(0) || 'T'}
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
            <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        
        {/* Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">
            {t('teams.switchingTo', 'Switching to')} {teamName}...
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('teams.loadingTeamData', 'Loading team data')}
          </p>
        </div>

        {/* Skeleton content preview */}
        <div className="w-full max-w-md space-y-4 mt-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
