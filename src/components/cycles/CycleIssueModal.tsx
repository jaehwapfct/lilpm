import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { issueService } from '@/lib/services/issueService';
import { cycleService } from '@/lib/services/cycleService';
import { useTeamStore } from '@/stores/teamStore';
import { StatusIcon, PriorityIcon } from '@/components/issues';
import { Search, Loader2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import type { Issue, Cycle } from '@/types/database';

interface CycleIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: Cycle;
  cycleIssues: Issue[];
  onIssuesUpdated: () => void;
}

export function CycleIssueModal({
  open,
  onOpenChange,
  cycle,
  cycleIssues,
  onIssuesUpdated,
}: CycleIssueModalProps) {
  const { t } = useTranslation();
  const { currentTeam } = useTeamStore();
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cycleIssueIds = new Set(cycleIssues.map(i => i.id));

  const loadIssues = useCallback(async () => {
    if (!currentTeam?.id) return;
    setIsLoading(true);
    try {
      const issues = await issueService.getIssues(currentTeam.id);
      // Filter to only show issues not completed
      setAllIssues(issues.filter(i => i.status !== 'done' && i.status !== 'cancelled'));
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam?.id]);

  useEffect(() => {
    if (open) {
      loadIssues();
      setSelectedToAdd(new Set());
      setSelectedToRemove(new Set());
      setSearchQuery('');
    }
  }, [open, loadIssues]);

  const availableIssues = allIssues.filter(
    issue => !cycleIssueIds.has(issue.id) && !issue.cycle_id
  );

  const filteredAvailable = availableIssues.filter(
    issue =>
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCycleIssues = cycleIssues.filter(
    issue =>
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAddIssue = (issueId: string) => {
    const newSet = new Set(selectedToAdd);
    if (newSet.has(issueId)) {
      newSet.delete(issueId);
    } else {
      newSet.add(issueId);
    }
    setSelectedToAdd(newSet);
  };

  const toggleRemoveIssue = (issueId: string) => {
    const newSet = new Set(selectedToRemove);
    if (newSet.has(issueId)) {
      newSet.delete(issueId);
    } else {
      newSet.add(issueId);
    }
    setSelectedToRemove(newSet);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Add issues to cycle
      await Promise.all(
        Array.from(selectedToAdd).map(id => cycleService.addIssueToCycle(id, cycle.id))
      );
      
      // Remove issues from cycle
      await Promise.all(
        Array.from(selectedToRemove).map(id => cycleService.removeIssueFromCycle(id))
      );

      const addedCount = selectedToAdd.size;
      const removedCount = selectedToRemove.size;

      if (addedCount > 0 && removedCount > 0) {
        toast.success(t('cycles.issuesUpdated', { added: addedCount, removed: removedCount }));
      } else if (addedCount > 0) {
        toast.success(t('cycles.issuesAdded', { count: addedCount }));
      } else if (removedCount > 0) {
        toast.success(t('cycles.issuesRemoved', { count: removedCount }));
      }

      onIssuesUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(t('cycles.issueUpdateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const IssueRow = ({ 
    issue, 
    isSelected, 
    onToggle,
    mode,
  }: { 
    issue: Issue; 
    isSelected: boolean; 
    onToggle: () => void;
    mode: 'add' | 'remove';
  }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected 
          ? mode === 'add' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
          : 'hover:bg-muted/50 border border-transparent'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <StatusIcon status={issue.status} className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs text-muted-foreground flex-shrink-0">{issue.identifier}</span>
        <span className="truncate text-sm">{issue.title}</span>
      </div>
      <PriorityIcon priority={issue.priority} className="h-4 w-4 flex-shrink-0" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('cycles.manageIssues')}
            <Badge variant="outline">{cycle.name}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('issues.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Current Cycle Issues */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-500" />
                  {t('cycles.currentIssues')}
                  <Badge variant="secondary">{cycleIssues.length}</Badge>
                </h3>
              </div>
              <ScrollArea className="flex-1 border border-border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredCycleIssues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t('cycles.noIssuesInCycle')}
                    </div>
                  ) : (
                    filteredCycleIssues.map(issue => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        isSelected={selectedToRemove.has(issue.id)}
                        onToggle={() => toggleRemoveIssue(issue.id)}
                        mode="remove"
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
              {selectedToRemove.size > 0 && (
                <div className="mt-2 text-xs text-red-500">
                  {t('cycles.willRemove', { count: selectedToRemove.size })}
                </div>
              )}
            </div>

            {/* Available Issues */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  {t('cycles.availableIssues')}
                  <Badge variant="secondary">{availableIssues.length}</Badge>
                </h3>
              </div>
              <ScrollArea className="flex-1 border border-border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredAvailable.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t('cycles.noAvailableIssues')}
                    </div>
                  ) : (
                    filteredAvailable.map(issue => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        isSelected={selectedToAdd.has(issue.id)}
                        onToggle={() => toggleAddIssue(issue.id)}
                        mode="add"
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
              {selectedToAdd.size > 0 && (
                <div className="mt-2 text-xs text-green-500">
                  {t('cycles.willAdd', { count: selectedToAdd.size })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || (selectedToAdd.size === 0 && selectedToRemove.size === 0)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.save')} 
            {(selectedToAdd.size > 0 || selectedToRemove.size > 0) && (
              <span className="ml-1">
                ({selectedToAdd.size > 0 && `+${selectedToAdd.size}`}
                {selectedToAdd.size > 0 && selectedToRemove.size > 0 && '/'}
                {selectedToRemove.size > 0 && `-${selectedToRemove.size}`})
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
