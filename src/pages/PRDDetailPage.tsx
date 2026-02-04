import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { prdService, type PRDWithRelations } from '@/lib/services/prdService';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  FileText,
  Target,
  Users,
  ListChecks,
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PRDDocument } from '@/types/database';

type PRDStatus = 'draft' | 'review' | 'approved' | 'archived';

interface UserStory {
  persona: string;
  action: string;
  benefit: string;
}

interface Requirement {
  type: 'functional' | 'non-functional';
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

export function PRDDetailPage() {
  const { prdId } = useParams<{ prdId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [prd, setPrd] = useState<PRDWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [timeline, setTimeline] = useState('');
  const [status, setStatus] = useState<PRDStatus>('draft');

  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);
  const [editingStoryIndex, setEditingStoryIndex] = useState<number | null>(null);
  const [editingRequirementIndex, setEditingRequirementIndex] = useState<number | null>(null);

  // Saving states
  const [titleSaved, setTitleSaved] = useState(false);
  const [overviewSaved, setOverviewSaved] = useState(false);
  const [timelineSaved, setTimelineSaved] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [storiesSaved, setStoriesSaved] = useState(false);
  const [requirementsSaved, setRequirementsSaved] = useState(false);

  const savePRD = useCallback(async (updates: Partial<any>) => {
    if (!prdId) return;
    try {
      await prdService.updatePRD(prdId, updates);
    } catch (error) {
      console.error('Failed to save PRD:', error);
      toast.error(t('common.error'));
    }
  }, [prdId, t]);

  // Auto-save hooks
  const { debouncedSave: debouncedSaveTitle } = useAutoSave({
    onSave: async (value) => {
      if (!prd || value === prd.title) return;
      await savePRD({ title: value.trim() });
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
    },
    delay: 1500,
  });

  const { debouncedSave: debouncedSaveOverview } = useAutoSave({
    onSave: async (value) => {
      if (!prd || value === (prd.overview || '')) return;
      await savePRD({ overview: value.trim() || null });
      setOverviewSaved(true);
      setTimeout(() => setOverviewSaved(false), 2000);
    },
    delay: 1500,
  });

  const { debouncedSave: debouncedSaveTimeline } = useAutoSave({
    onSave: async (value) => {
      if (!prd || value === (prd.timeline || '')) return;
      await savePRD({ timeline: value.trim() || null });
      setTimelineSaved(true);
      setTimeout(() => setTimelineSaved(false), 2000);
    },
    delay: 1500,
  });

  const { debouncedSave: debouncedSaveGoals } = useAutoSave({
    onSave: async (value) => {
      const goalsArray = JSON.parse(value) as string[];
      await savePRD({ goals: goalsArray.filter(g => g.trim()) as unknown as any });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2000);
    },
    delay: 1500,
  });

  const { debouncedSave: debouncedSaveStories } = useAutoSave({
    onSave: async (value) => {
      const storiesArray = JSON.parse(value) as UserStory[];
      await savePRD({ user_stories: storiesArray.filter(s => s.action.trim()) as unknown as any });
      setStoriesSaved(true);
      setTimeout(() => setStoriesSaved(false), 2000);
    },
    delay: 1500,
  });

  const { debouncedSave: debouncedSaveRequirements } = useAutoSave({
    onSave: async (value) => {
      const reqsArray = JSON.parse(value) as Requirement[];
      await savePRD({ requirements: reqsArray.filter(r => r.description.trim()) as unknown as any });
      setRequirementsSaved(true);
      setTimeout(() => setRequirementsSaved(false), 2000);
    },
    delay: 1500,
  });

  useEffect(() => {
    const loadPRD = async () => {
      if (!prdId) return;
      
      setIsLoading(true);
      try {
        const data = await prdService.getPRD(prdId);
        if (data) {
          setPrd(data);
          setTitle(data.title);
          setOverview(data.overview || '');
          setGoals((data.goals as unknown as string[]) || []);
          setUserStories((data.user_stories as unknown as UserStory[]) || []);
          setRequirements((data.requirements as unknown as Requirement[]) || []);
          setTimeline(data.timeline || '');
          setStatus(data.status as PRDStatus);
        }
      } catch (error) {
        console.error('Failed to load PRD:', error);
        toast.error(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPRD();
  }, [prdId, t]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleOverviewChange = (value: string) => {
    setOverview(value);
    debouncedSaveOverview(value);
  };

  const handleTimelineChange = (value: string) => {
    setTimeline(value);
    debouncedSaveTimeline(value);
  };

  const handleSave = async () => {
    if (!prdId || !title.trim()) return;
    
    setIsSaving(true);
    try {
      await prdService.updatePRD(prdId, {
        title: title.trim(),
        overview: overview.trim() || null,
        goals: goals.filter(g => g.trim()) as unknown as any,
        user_stories: userStories.filter(s => s.action.trim()) as unknown as any,
        requirements: requirements.filter(r => r.description.trim()) as unknown as any,
        timeline: timeline.trim() || null,
        status,
      });
      
      // Exit all editing modes after save
      setIsEditingTitle(false);
      setIsEditingOverview(false);
      setIsEditingTimeline(false);
      setEditingGoalIndex(null);
      setEditingStoryIndex(null);
      setEditingRequirementIndex(null);
      
      toast.success(t('settings.saved'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const addGoal = () => {
    const updated = [...goals, ''];
    setGoals(updated);
    setEditingGoalIndex(updated.length - 1);
  };
  const removeGoal = (index: number) => {
    const updated = goals.filter((_, i) => i !== index);
    setGoals(updated);
    debouncedSaveGoals(JSON.stringify(updated));
  };
  const updateGoal = (index: number, value: string) => {
    const updated = [...goals];
    updated[index] = value;
    setGoals(updated);
    debouncedSaveGoals(JSON.stringify(updated));
  };

  const addUserStory = () => {
    const updated = [...userStories, { persona: '', action: '', benefit: '' }];
    setUserStories(updated);
    setEditingStoryIndex(updated.length - 1);
  };
  const removeUserStory = (index: number) => {
    const updated = userStories.filter((_, i) => i !== index);
    setUserStories(updated);
    debouncedSaveStories(JSON.stringify(updated));
  };
  const updateUserStory = (index: number, field: keyof UserStory, value: string) => {
    const updated = [...userStories];
    updated[index] = { ...updated[index], [field]: value };
    setUserStories(updated);
    debouncedSaveStories(JSON.stringify(updated));
  };

  const addRequirement = () => {
    const updated = [...requirements, { type: 'functional' as const, description: '', priority: 'medium' as const }];
    setRequirements(updated);
    setEditingRequirementIndex(updated.length - 1);
  };
  const removeRequirement = (index: number) => {
    const updated = requirements.filter((_, i) => i !== index);
    setRequirements(updated);
    debouncedSaveRequirements(JSON.stringify(updated));
  };
  const updateRequirement = (index: number, field: keyof Requirement, value: string) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value } as Requirement;
    setRequirements(updated);
    debouncedSaveRequirements(JSON.stringify(updated));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!prd) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">{t('prd.notFound', 'PRD not found')}</p>
          <Button onClick={() => navigate('/prd')}>{t('prd.backToList', 'Back to PRDs')}</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/prd')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{title || t('prd.untitled', 'Untitled PRD')}</h1>
                {prd.project && (
                  <p className="text-xs text-muted-foreground">📁 {prd.project.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as PRDStatus)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
          {/* Title - Click to edit */}
          <div className="space-y-4">
            <div className="relative group">
              {isEditingTitle ? (
                <div className="relative">
                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    autoFocus
                    placeholder={t('prd.titlePlaceholder', 'PRD Title')}
                    className="text-2xl font-bold border-none px-0 focus-visible:ring-1 focus-visible:ring-primary h-auto py-2"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {titleSaved && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
              ) : (
                <h2 
                  className="text-2xl font-bold cursor-text hover:bg-muted/50 rounded px-1 py-2 -mx-1 transition-colors flex items-center gap-2"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {title || t('prd.titlePlaceholder', 'PRD Title')}
                  <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                </h2>
              )}
            </div>

            {/* Overview - Click to edit */}
            <div className="relative group">
              {isEditingOverview ? (
                <div className="relative">
                  <Textarea
                    value={overview}
                    onChange={(e) => handleOverviewChange(e.target.value)}
                    onBlur={() => setIsEditingOverview(false)}
                    autoFocus
                    placeholder={t('prd.overviewPlaceholder', 'Write a brief overview of this product/feature...')}
                    rows={4}
                    className="focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {overviewSaved && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
              ) : (
                <div 
                  className="min-h-[100px] p-3 border border-transparent hover:border-border rounded-md cursor-text hover:bg-muted/30 transition-colors"
                  onClick={() => setIsEditingOverview(true)}
                >
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {overview || t('prd.overviewPlaceholder', 'Write a brief overview of this product/feature...')}
                  </p>
                  <Pencil className="h-4 w-4 mt-2 opacity-0 group-hover:opacity-50" />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Goals */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('prd.goals', 'Goals')}
                </CardTitle>
                {goalsSaved && <Check className="h-4 w-4 text-green-500" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex gap-2 group">
                  {editingGoalIndex === index ? (
                    <Input
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      onBlur={() => setEditingGoalIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setEditingGoalIndex(null);
                        }
                      }}
                      autoFocus
                      placeholder={t('prd.goalPlaceholder', 'Enter a goal...')}
                      className="flex-1"
                    />
                  ) : (
                    <div 
                      className="flex-1 px-3 py-2 border rounded-md cursor-text hover:bg-muted/50 transition-colors"
                      onClick={() => setEditingGoalIndex(index)}
                    >
                      {goal || <span className="text-muted-foreground">{t('prd.goalPlaceholder', 'Enter a goal...')}</span>}
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => removeGoal(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGoal}>
                <Plus className="h-4 w-4 mr-2" />
                {t('prd.addGoal', 'Add Goal')}
              </Button>
            </CardContent>
          </Card>

          {/* User Stories */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('prd.userStories', 'User Stories')}
                </CardTitle>
                {storiesSaved && <Check className="h-4 w-4 text-green-500" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStories.map((story, index) => (
                <div 
                  key={index} 
                  className="p-3 border rounded-lg space-y-2 group cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => editingStoryIndex !== index && setEditingStoryIndex(index)}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-muted-foreground">Story {index + 1}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUserStory(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {editingStoryIndex === index ? (
                    <div className="grid gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">As a</span>
                        <Input
                          value={story.persona}
                          onChange={(e) => updateUserStory(index, 'persona', e.target.value)}
                          placeholder="user type"
                          className="flex-1 h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">I want to</span>
                        <Input
                          value={story.action}
                          onChange={(e) => updateUserStory(index, 'action', e.target.value)}
                          placeholder="action/feature"
                          className="flex-1 h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">So that</span>
                        <Input
                          value={story.benefit}
                          onChange={(e) => updateUserStory(index, 'benefit', e.target.value)}
                          placeholder="benefit/reason"
                          className="flex-1 h-8"
                          onBlur={() => setEditingStoryIndex(null)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <p>
                        <span className="text-muted-foreground">As a </span>
                        <span className="font-medium">{story.persona || '...'}</span>
                        <span className="text-muted-foreground">, I want to </span>
                        <span className="font-medium">{story.action || '...'}</span>
                        <span className="text-muted-foreground"> so that </span>
                        <span className="font-medium">{story.benefit || '...'}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addUserStory}>
                <Plus className="h-4 w-4 mr-2" />
                {t('prd.addUserStory', 'Add User Story')}
              </Button>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  {t('prd.requirements', 'Requirements')}
                </CardTitle>
                {requirementsSaved && <Check className="h-4 w-4 text-green-500" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {requirements.map((req, index) => (
                <div 
                  key={index} 
                  className="flex gap-2 items-start group"
                  onClick={() => editingRequirementIndex !== index && setEditingRequirementIndex(index)}
                >
                  {editingRequirementIndex === index ? (
                    <>
                      <Select 
                        value={req.type} 
                        onValueChange={(v) => updateRequirement(index, 'type', v)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="functional">Functional</SelectItem>
                          <SelectItem value="non-functional">Non-functional</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={req.description}
                        onChange={(e) => updateRequirement(index, 'description', e.target.value)}
                        placeholder="Requirement description..."
                        className="flex-1 h-8"
                        onBlur={() => setEditingRequirementIndex(null)}
                      />
                      <Select 
                        value={req.priority} 
                        onValueChange={(v) => updateRequirement(index, 'priority', v)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className="text-xs">{req.type}</Badge>
                      <span className="flex-1">{req.description || 'Requirement description...'}</span>
                      <Badge variant="secondary" className="text-xs">{req.priority}</Badge>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRequirement(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRequirement}>
                <Plus className="h-4 w-4 mr-2" />
                {t('prd.addRequirement', 'Add Requirement')}
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('prd.timeline', 'Timeline')}
                </CardTitle>
                {timelineSaved && <Check className="h-4 w-4 text-green-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative group">
                {isEditingTimeline ? (
                  <Textarea
                    value={timeline}
                    onChange={(e) => handleTimelineChange(e.target.value)}
                    onBlur={() => setIsEditingTimeline(false)}
                    autoFocus
                    placeholder={t('prd.timelinePlaceholder', 'Describe the expected timeline, milestones, and deadlines...')}
                    rows={4}
                    className="focus-visible:ring-1 focus-visible:ring-primary"
                  />
                ) : (
                  <div 
                    className="min-h-[100px] p-3 border border-transparent hover:border-border rounded-md cursor-text hover:bg-muted/30 transition-colors"
                    onClick={() => setIsEditingTimeline(true)}
                  >
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {timeline || t('prd.timelinePlaceholder', 'Describe the expected timeline, milestones, and deadlines...')}
                    </p>
                    <Pencil className="h-4 w-4 mt-2 opacity-0 group-hover:opacity-50" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Issues Button */}
          <div className="flex justify-center py-4">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/lily')}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('prd.generateIssues', 'Generate Issues from this PRD')}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
