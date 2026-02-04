import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { useTeamStore } from '@/stores/teamStore';
import { useLanguageStore } from '@/stores/languageStore';
import { cycleService } from '@/lib/services/cycleService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Target,
  Loader2,
  ArrowRight,
  LayoutList,
  BarChart3,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { BurndownChart, CycleIssueModal } from '@/components/cycles';
import type { Cycle, CycleStatus, Issue } from '@/types/database';

const STATUS_CONFIG: Record<CycleStatus, { labelKey: string; color: string; icon: React.ReactNode }> = {
  upcoming: { labelKey: 'cycles.upcoming', color: 'bg-blue-500/10 text-blue-500', icon: <Clock className="h-4 w-4" /> },
  active: { labelKey: 'cycles.active', color: 'bg-green-500/10 text-green-500', icon: <Play className="h-4 w-4" /> },
  completed: { labelKey: 'cycles.completed', color: 'bg-muted text-muted-foreground', icon: <CheckCircle2 className="h-4 w-4" /> },
};

interface CycleWithStats extends Cycle {
  issues: Issue[];
  completedCount: number;
  totalCount: number;
  progress: number;
}

export function CyclesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTeam } = useTeamStore();
  const { language } = useLanguageStore();
  const dateLocale = language === 'ko' ? ko : enUS;
  
  const [cycles, setCycles] = useState<CycleWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [issueModalCycle, setIssueModalCycle] = useState<CycleWithStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'list' | 'chart'>('list');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCycles = useCallback(async () => {
    if (!currentTeam?.id) return;

    setIsLoading(true);
    try {
      const cyclesData = await cycleService.getCycles(currentTeam.id);
      
      // Load issues for each cycle
      const cyclesWithStats = await Promise.all(
        cyclesData.map(async (cycle) => {
          const issues = await cycleService.getCycleIssues(cycle.id);
          const completedCount = issues.filter(i => i.status === 'done').length;
          return {
            ...cycle,
            issues,
            completedCount,
            totalCount: issues.length,
            progress: issues.length > 0 ? (completedCount / issues.length) * 100 : 0,
          };
        })
      );

      setCycles(cyclesWithStats);
    } catch (error) {
      console.error('Failed to load cycles:', error);
      toast.error(t('cycles.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam?.id, t]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const handleOpenCreate = async () => {
    if (!currentTeam?.id) return;

    const nextNumber = await cycleService.getNextCycleNumber(currentTeam.id);
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    setFormData({
      name: `Sprint ${nextNumber}`,
      description: '',
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(twoWeeksLater, 'yyyy-MM-dd'),
    });
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    if (!currentTeam?.id) return;

    setIsSubmitting(true);
    try {
      const nextNumber = await cycleService.getNextCycleNumber(currentTeam.id);
      await cycleService.createCycle(currentTeam.id, {
        name: formData.name,
        number: nextNumber,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
      });
      toast.success(t('cycles.cycleCreated'));
      setCreateModalOpen(false);
      loadCycles();
    } catch (error) {
      toast.error(t('cycles.createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name,
      description: cycle.description || '',
      start_date: cycle.start_date,
      end_date: cycle.end_date,
    });
  };

  const handleUpdate = async () => {
    if (!editingCycle) return;

    setIsSubmitting(true);
    try {
      await cycleService.updateCycle(editingCycle.id, {
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
      });
      toast.success(t('cycles.cycleUpdated'));
      setEditingCycle(null);
      loadCycles();
    } catch (error) {
      toast.error(t('cycles.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cycle: Cycle) => {
    if (!confirm(t('cycles.deleteConfirm', { name: cycle.name }))) return;

    try {
      await cycleService.deleteCycle(cycle.id);
      toast.success(t('cycles.cycleDeleted'));
      loadCycles();
    } catch (error) {
      toast.error(t('cycles.deleteError'));
    }
  };

  const handleStartCycle = async (cycle: Cycle) => {
    try {
      await cycleService.startCycle(cycle.id);
      toast.success(t('cycles.cycleStarted'));
      loadCycles();
    } catch (error) {
      toast.error(t('cycles.startError'));
    }
  };

  const handleCompleteCycle = async (cycle: Cycle) => {
    try {
      await cycleService.completeCycle(cycle.id);
      toast.success(t('cycles.cycleCompleted'));
      loadCycles();
    } catch (error) {
      toast.error(t('cycles.completeError'));
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return t('dashboard.ended');
    if (days === 0) return t('dashboard.endsToday');
    return t('dashboard.daysRemaining', { count: days });
  };

  const activeCycles = cycles.filter(c => c.status === 'active');
  const upcomingCycles = cycles.filter(c => c.status === 'upcoming');
  const completedCycles = cycles.filter(c => c.status === 'completed');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{t('cycles.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('cycles.manageTeamSprints')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'list' | 'chart')}>
              <TabsList className="h-9">
                <TabsTrigger value="list" className="px-2 sm:px-3">
                  <LayoutList className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('cycles.listView')}</span>
                </TabsTrigger>
                <TabsTrigger value="chart" className="px-2 sm:px-3">
                  <BarChart3 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('cycles.chartView')}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleOpenCreate} size="sm" className="sm:size-default">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('cycles.newCycle')}</span>
            </Button>
          </div>
        </div>

        {/* Active Cycles with Burndown Chart */}
        {activeCycles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              {t('cycles.activeSprints')}
            </h2>
            
            {activeCycles.map((cycle) => (
              <div key={cycle.id} className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {/* Cycle Info Card */}
                <Card className="border-green-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Target className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cycle.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(cycle.start_date), 'MMM d', { locale: dateLocale })} 
                            <ArrowRight className="h-3 w-3" />
                            {format(new Date(cycle.end_date), 'MMM d', { locale: dateLocale })}
                            <Badge variant="outline" className="ml-2">
                              {getDaysRemaining(cycle.end_date)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/cycle/${cycle.id}`)}>
                            {t('cycles.viewIssues')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIssueModalCycle(cycle)}>
                            <ListChecks className="h-4 w-4 mr-2" />
                            {t('cycles.manageIssues')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(cycle)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleCompleteCycle(cycle)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t('cycles.complete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cycle.description && (
                      <p className="text-sm text-muted-foreground mb-4">{cycle.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('dashboard.progress')}</span>
                        <span className="font-medium">
                          {cycle.completedCount}/{cycle.totalCount} {t('cycles.issuesCompleted')} ({Math.round(cycle.progress)}%)
                        </span>
                      </div>
                      <Progress value={cycle.progress} className="h-2" />
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIssueModalCycle(cycle)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('cycles.addIssues')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/cycle/${cycle.id}`)}
                      >
                        {t('cycles.viewIssues')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Burndown Chart */}
                {selectedTab === 'chart' && (
                  <BurndownChart
                    startDate={cycle.start_date}
                    endDate={cycle.end_date}
                    issues={cycle.issues}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Cycles */}
        {upcomingCycles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              {t('cycles.upcomingSprints')}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingCycles.map((cycle) => (
                <Card key={cycle.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{cycle.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cycle.start_date), 'MMM d', { locale: dateLocale })} 
                          → {format(new Date(cycle.end_date), 'MMM d', { locale: dateLocale })}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartCycle(cycle)}>
                            <Play className="h-4 w-4 mr-2" />
                            {t('cycles.start')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIssueModalCycle(cycle)}>
                            <ListChecks className="h-4 w-4 mr-2" />
                            {t('cycles.manageIssues')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(cycle)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(cycle)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {cycle.totalCount} {t('issues.title').toLowerCase()}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIssueModalCycle(cycle)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('cycles.addIssues')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Cycles */}
        {completedCycles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              {t('cycles.completedSprints')}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedCycles.slice(0, 6).map((cycle) => (
                <Card key={cycle.id} className="opacity-75">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{cycle.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(cycle.start_date), 'MMM d', { locale: dateLocale })} 
                      → {format(new Date(cycle.end_date), 'MMM d', { locale: dateLocale })}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {cycle.completedCount}/{cycle.totalCount} {t('cycles.completed')} ({Math.round(cycle.progress)}%)
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {cycles.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('cycles.noCycles')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('cycles.createFirstCycle')}
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('cycles.createFirstButton')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cycles.newCycle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('cycles.cycleName')}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sprint 1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('cycles.cycleDescription')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('cycles.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('cycles.startDate')}</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('cycles.endDate')}</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingCycle} onOpenChange={() => setEditingCycle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cycles.editCycle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('cycles.cycleName')}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('cycles.cycleDescription')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('cycles.startDate')}</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('cycles.endDate')}</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCycle(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Assignment Modal */}
      {issueModalCycle && (
        <CycleIssueModal
          open={!!issueModalCycle}
          onOpenChange={() => setIssueModalCycle(null)}
          cycle={issueModalCycle}
          cycleIssues={issueModalCycle.issues}
          onIssuesUpdated={loadCycles}
        />
      )}
    </AppLayout>
  );
}
