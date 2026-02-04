import React, { useState } from 'react';
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
import { projectService } from '@/lib/services/projectService';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
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

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const { currentTeam } = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    icon: 'folder',
    startDate: '',
    targetDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !form.name.trim()) return;

    setIsLoading(true);
    try {
      await projectService.createProject(currentTeam.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
        start_date: form.startDate || undefined,
        target_date: form.targetDate || undefined,
      });
      
      toast.success('프로젝트가 생성되었습니다');
      setForm({ name: '', description: '', color: '#6366F1', icon: 'folder', startDate: '', targetDate: '' });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('프로젝트 생성에 실패했습니다');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 프로젝트 만들기</DialogTitle>
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
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="프로젝트 이름"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
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
              <Label htmlFor="startDate">시작일 (선택)</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">목표일 (선택)</Label>
              <Input
                id="targetDate"
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
              프로젝트 만들기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
