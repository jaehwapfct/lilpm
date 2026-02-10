import React, { useEffect } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, UserMinus, Edit3, Eye } from 'lucide-react';

/**
 * Component that listens to collaboration events and shows toast notifications
 */
export function CollaborationToast() {
  const { t } = useTranslation();

  useEffect(() => {
    const handleUserJoined = (event: CustomEvent) => {
      const { name } = event.detail;
      toast(t('collaboration.userJoined', { name }), {
        icon: <UserPlus className="h-4 w-4 text-green-500" />,
        duration: 3000,
      });
    };

    const handleUserLeft = (event: CustomEvent) => {
      const { name } = event.detail;
      toast(t('collaboration.userLeft', { name }), {
        icon: <UserMinus className="h-4 w-4 text-slate-400" />,
        duration: 3000,
      });
    };

    const handleUserStartedEditing = (event: CustomEvent) => {
      const { name, issueTitle } = event.detail;
      toast(t('collaboration.userStartedEditing', { name, issue: issueTitle }), {
        icon: <Edit3 className="h-4 w-4 text-amber-500" />,
        duration: 4000,
      });
    };

    const handleUserViewingIssue = (event: CustomEvent) => {
      const { name, issueTitle } = event.detail;
      toast(t('collaboration.userViewingIssue', { name, issue: issueTitle }), {
        icon: <Eye className="h-4 w-4 text-blue-500" />,
        duration: 3000,
      });
    };

    window.addEventListener('collaboration:user:joined', handleUserJoined as EventListener);
    window.addEventListener('collaboration:user:left', handleUserLeft as EventListener);
    window.addEventListener('collaboration:user:editing', handleUserStartedEditing as EventListener);
    window.addEventListener('collaboration:user:viewing', handleUserViewingIssue as EventListener);

    return () => {
      window.removeEventListener('collaboration:user:joined', handleUserJoined as EventListener);
      window.removeEventListener('collaboration:user:left', handleUserLeft as EventListener);
      window.removeEventListener('collaboration:user:editing', handleUserStartedEditing as EventListener);
      window.removeEventListener('collaboration:user:viewing', handleUserViewingIssue as EventListener);
    };
  }, [t]);

  return null;
}
