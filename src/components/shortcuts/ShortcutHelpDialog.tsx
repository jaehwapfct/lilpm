import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutGroups = [
  {
    title: 'navigation',
    shortcuts: [
      { keys: 'G D', action: 'goToDashboard' },
      { keys: 'G I', action: 'goToIssues' },
      { keys: 'G M', action: 'goToMyIssues' },
      { keys: 'G P', action: 'goToProjects' },
      { keys: 'G C', action: 'goToCycles' },
      { keys: 'G S', action: 'goToSettings' },
      { keys: 'L', action: 'goToLily' },
    ],
  },
  {
    title: 'actions',
    shortcuts: [
      { keys: 'C', action: 'createIssue' },
      { keys: '⌘K or /', action: 'search' },
      { keys: '?', action: 'showHelp' },
    ],
  },
];

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  const { t } = useTranslation();

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      goToDashboard: t('nav.inbox'),
      goToIssues: t('nav.allIssues'),
      goToMyIssues: t('nav.myIssues'),
      goToProjects: t('nav.projects'),
      goToCycles: t('cycles.title'),
      goToSettings: t('common.settings'),
      goToLily: t('lily.title'),
      createIssue: t('issues.createIssue'),
      search: t('common.search'),
      showHelp: t('shortcuts.showHelp'),
    };
    return labels[action] || action;
  };

  const getGroupTitle = (group: string) => {
    const titles: Record<string, string> = {
      navigation: t('shortcuts.navigation'),
      actions: t('shortcuts.actions'),
    };
    return titles[group] || group;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('shortcuts.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {getGroupTitle(group.title)}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map(({ keys, action }) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm">{getActionLabel(action)}</span>
                    <div className="flex items-center gap-1">
                      {keys.split(' ').map((key, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-muted-foreground text-xs">then</span>}
                          <kbd className="kbd px-2 py-0.5 text-xs">{key}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
