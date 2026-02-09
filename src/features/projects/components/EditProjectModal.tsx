import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectService } from '@/lib/services';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/database';

interface EditProjectModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PROJECT_COLORS = [
  { value: '#6366F1', label: '인디고' },
  { value: '#8B5CF6', label: '바이올렛' },
  { value: '#EC4899', label: '핑크' },
  { value: '#EF4444', label: '레드' },
  { value: '#F97316', label: '오렌지' },
  { value: '#EAB308', label: '옐로우' },
  { value: '#22C55E', label: '그린' },
  { value: '#14B8A6', label: '틸' },
  { value: '#0EA5E9', label: '스카이' },
];

const PROJECT_ICONS = [
  { value: 'folder', label: '📁' },
  { value: 'rocket', label: '🚀' },
  { value: 'star', label: '⭐' },
  { value: 'lightning', label: '⚡' },
  { value: 'target', label: '🎯' },
  { value: 'gem', label: '💎' },
  { value: 'fire', label: '🔥' },
  { value: 'heart', label: '❤️' },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planned', label: '계획됨' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'paused', label: '일시 정지' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소됨' },
];

export function EditProjectModal({ project, open, onOpenChange, onSuccess }: EditProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    icon: 'folder',
    status: 'planned' as ProjectStatus,
    startDate: '',
    targetDate: '',
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description || '',
        color: project.color,
        icon: project.icon || 'folder',
        status: project.status,
        startDate: project.start_date || '',
        targetDate: project.target_date || '',
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !form.name.trim()) return;

    setIsLoading(true);
    try {
      await projectService.updateProject(project.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        icon: form.icon,
        status: form.status,
        start_date: form.startDate || null,
        target_date: form.targetDate || null,
      } as any);
      
      toast.success('프로젝트가 수정되었습니다');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('프로젝트 수정에 실패했습니다');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon & Name */}
          <div className="flex gap-3">
            <div className="space-y-2">
              <Label>아이콘</Label>
              <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-2">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                placeholder="프로젝트 이름"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>상태</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">설명 (선택)</Label>
            <Textarea
              id="edit-description"
              placeholder="프로젝트에 대한 간단한 설명"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: color.value }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color.value 
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">시작일 (선택)</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-targetDate">목표일 (선택)</Label>
              <Input
                id="edit-targetDate"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading || !form.name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
