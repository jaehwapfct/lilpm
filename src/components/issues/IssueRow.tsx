import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MoreHorizontal, 
  MessageSquare,
  Paperclip,
  GitBranch,
} from 'lucide-react';
import type { Issue, IssueType } from '@/types';
import { cn } from '@/lib/utils';
import { StatusIcon, PriorityIcon } from './IssueIcons';
import { IssueTypeIcon, issueTypeConfig } from './IssueTypeIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IssueRowProps {
  issue: Issue;
  isSelected?: boolean;
  onSelect?: (issueId: string, selected: boolean) => void;
  onStatusChange?: (issueId: string, status: Issue['status']) => void;
  onPriorityChange?: (issueId: string, priority: Issue['priority']) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function IssueRow({ 
  issue, 
  isSelected, 
  onSelect,
  onStatusChange,
  onPriorityChange,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}: IssueRowProps) {
  return (
    <div 
      className={cn(
        "group flex items-center gap-3 px-4 py-2 border-b border-border hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        isDragging && "opacity-50",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect?.(issue.id, !!checked)}
        className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
      />

      {/* Issue Type with Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0">
            <IssueTypeIcon type={((issue as any).type as IssueType) || 'task'} size="sm" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {issueTypeConfig[((issue as any).type as IssueType) || 'task']?.label || 'Task'}
        </TooltipContent>
      </Tooltip>

      {/* Priority */}
      <button 
        className="flex-shrink-0 hover:bg-muted rounded p-1"
        onClick={() => {/* Open priority picker */}}
      >
        <PriorityIcon priority={issue.priority} />
      </button>

      {/* Identifier */}
      <span className="flex-shrink-0 text-xs text-muted-foreground font-mono w-16">
        {issue.identifier}
      </span>

      {/* Status */}
      <button 
        className="flex-shrink-0 hover:bg-muted rounded p-1"
        onClick={() => {/* Open status picker */}}
      >
        <StatusIcon status={issue.status} />
      </button>

      {/* Title */}
      <Link 
        to={`/issue/${issue.id}`}
        className="flex-1 min-w-0 text-sm truncate hover:text-primary"
      >
        {issue.title}
      </Link>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {issue.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium"
              style={{ 
                backgroundColor: `${label.color}20`, 
                color: label.color 
              }}
            >
              {label.name}
            </span>
          ))}
          {issue.labels.length > 2 && (
            <span className="text-2xs text-muted-foreground">
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Meta Icons */}
      <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
        {/* Placeholder for comments count */}
        <div className="flex items-center gap-1 text-xs">
          <MessageSquare className="h-3 w-3" />
          <span>0</span>
        </div>
      </div>

      {/* Assignee */}
      <div className="flex-shrink-0">
        {issue.assignee ? (
          <Avatar className="h-5 w-5">
            <AvatarImage src={issue.assignee.avatarUrl} />
            <AvatarFallback className="text-2xs">
              {issue.assignee.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/50" />
        )}
      </div>

      {/* Due Date */}
      {issue.dueDate && (
        <span className="hidden md:inline text-xs text-muted-foreground">
          {new Date(issue.dueDate).toLocaleDateString()}
        </span>
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>이슈 열기</DropdownMenuItem>
          <DropdownMenuItem>새 탭에서 열기</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>상태 변경</DropdownMenuItem>
          <DropdownMenuItem>우선순위 변경</DropdownMenuItem>
          <DropdownMenuItem>담당자 변경</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>복제</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">삭제</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
