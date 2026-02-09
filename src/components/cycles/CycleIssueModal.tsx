import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { issueService } from '@/lib/services';
import { cycleService } from '@/lib/services/cycleService';
import { useTeamStore } from '@/stores/teamStore';
import { StatusIcon, PriorityIcon } from '@/components/issues';
import { Search, Loader2, Plus, Minus, X, ArrowLeft, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Issue, Cycle, IssueStatus, IssuePriority } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  // Inline creation state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<IssuePriority>('medium');
  const [isCreating, setIsCreating] = useState(false);

  // AI batch creation state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title: string; description: string }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedAiSuggestions, setSelectedAiSuggestions] = useState<Set<number>>(new Set());

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

  // Quick create a new issue and add it to this cycle
  const handleQuickCreate = async () => {
    if (!currentTeam?.id || !newIssueTitle.trim()) return;
    setIsCreating(true);
    try {
      const newIssue = await issueService.createIssue(currentTeam.id, {
        title: newIssueTitle.trim(),
        priority: newIssuePriority,
        status: 'backlog' as IssueStatus,
        cycle_id: cycle.id, // Directly assign to this cycle
      });
      toast.success(t('issues.created', { title: newIssue.title }));
      setNewIssueTitle('');
      setShowQuickCreate(false);
      loadIssues();
      onIssuesUpdated();
    } catch (error) {
      toast.error(t('issues.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  // Generate multiple issues with AI (mock implementation - can be connected to Lily AI)
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      // Mock AI response - in production, this would call the Lily AI API
      const mockSuggestions = [
        { title: `${aiPrompt} - Task 1`, description: 'Generated from AI prompt' },
        { title: `${aiPrompt} - Task 2`, description: 'Generated from AI prompt' },
        { title: `${aiPrompt} - Task 3`, description: 'Generated from AI prompt' },
        { title: `${aiPrompt} - Review and QA`, description: 'Quality assurance task' },
        { title: `${aiPrompt} - Documentation`, description: 'Documentation task' },
      ];
      setAiSuggestions(mockSuggestions);
      setSelectedAiSuggestions(new Set(mockSuggestions.map((_, i) => i))); // Select all by default
    } catch (error) {
      toast.error(t('ai.generationError'));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Create all selected AI suggestions as issues
  const handleCreateAiIssues = async () => {
    if (!currentTeam?.id || selectedAiSuggestions.size === 0) return;
    setIsCreating(true);
    try {
      const issuesToCreate = Array.from(selectedAiSuggestions).map(i => aiSuggestions[i]);
      await Promise.all(
        issuesToCreate.map(suggestion =>
          issueService.createIssue(currentTeam.id, {
            title: suggestion.title,
            description: suggestion.description,
            priority: 'medium' as IssuePriority,
            status: 'backlog' as IssueStatus,
            cycle_id: cycle.id,
          })
        )
      );
      toast.success(t('issues.batchCreated', { count: issuesToCreate.length }));
      setAiSuggestions([]);
      setAiPrompt('');
      setShowAiPanel(false);
      setSelectedAiSuggestions(new Set());
      loadIssues();
      onIssuesUpdated();
    } catch (error) {
      toast.error(t('issues.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAiSuggestion = (index: number) => {
    const newSet = new Set(selectedAiSuggestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedAiSuggestions(newSet);
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
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected
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

  // Full-screen overlay (not a dialog)
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{t('cycles.manageIssues')}</h1>
            <Badge variant="outline" className="text-sm">{cycle.name}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-73px)] p-6">
        {/* Search */}
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('issues.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
            {/* Current Cycle Issues */}
            <div className="flex flex-col min-h-0 bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Minus className="h-5 w-5 text-red-500" />
                  {t('cycles.currentIssues')}
                  <Badge variant="secondary">{cycleIssues.length}</Badge>
                </h3>
                {selectedToRemove.size > 0 && (
                  <div className="text-sm text-red-500 font-medium">
                    {t('cycles.willRemove', { count: selectedToRemove.size })}
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredCycleIssues.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
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
            </div>

            {/* Available Issues */}
            <div className="flex flex-col min-h-0 bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-500" />
                  {t('cycles.availableIssues')}
                  <Badge variant="secondary">{availableIssues.length}</Badge>
                </h3>
                <div className="flex items-center gap-2">
                  {selectedToAdd.size > 0 && (
                    <div className="text-sm text-green-500 font-medium">
                      {t('cycles.willAdd', { count: selectedToAdd.size })}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickCreate(!showQuickCreate)}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('issues.quickCreate', 'Quick Create')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="gap-1 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    {t('ai.batchCreate', 'Lily AI')}
                  </Button>
                </div>
              </div>

              {/* Quick Create Form */}
              {showQuickCreate && (
                <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('issues.titlePlaceholder', 'Issue title...')}
                      value={newIssueTitle}
                      onChange={(e) => setNewIssueTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                      className="flex-1"
                      autoFocus
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <PriorityIcon priority={newIssuePriority} className="h-3.5 w-3.5" />
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(['urgent', 'high', 'medium', 'low', 'none'] as IssuePriority[]).map(p => (
                          <DropdownMenuItem key={p} onClick={() => setNewIssuePriority(p)}>
                            <PriorityIcon priority={p} className="h-4 w-4 mr-2" />
                            {t(`priority.${p}`, p)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      onClick={handleQuickCreate}
                      disabled={!newIssueTitle.trim() || isCreating}
                    >
                      {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      {t('common.create')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQuickCreate(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* AI Batch Create Panel */}
              {showAiPanel && (
                <div className="mb-4 p-4 rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <span className="font-medium">{t('ai.batchCreateTitle', 'Generate Issues with Lily AI')}</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Textarea
                      placeholder={t('ai.promptPlaceholder', 'Describe the feature or task to generate issues for...')}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 min-h-[80px]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={handleAiGenerate}
                      disabled={!aiPrompt.trim() || isAiLoading}
                      className="gap-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                    >
                      {isAiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <Zap className="h-3.5 w-3.5" />
                      {t('ai.generate', 'Generate Issues')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowAiPanel(false); setAiSuggestions([]); }}
                    >
                      {t('common.close')}
                    </Button>
                  </div>

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t('ai.suggestions', 'Generated Issues')}</span>
                        <span className="text-muted-foreground">
                          {selectedAiSuggestions.size}/{aiSuggestions.length} {t('common.selected', 'selected')}
                        </span>
                      </div>
                      {aiSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleAiSuggestion(idx)}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${selectedAiSuggestions.has(idx)
                              ? 'border-violet-500/50 bg-violet-500/10'
                              : 'border-border hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={selectedAiSuggestions.has(idx)} />
                            <span className="text-sm">{suggestion.title}</span>
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        onClick={handleCreateAiIssues}
                        disabled={selectedAiSuggestions.size === 0 || isCreating}
                        className="w-full mt-2"
                      >
                        {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        {t('ai.createSelected', 'Create Selected Issues')} ({selectedAiSuggestions.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredAvailable.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
