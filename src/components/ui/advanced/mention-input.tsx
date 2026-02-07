import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onMention?: (userId: string, userName: string) => void;
  members: Profile[];
  placeholder?: string;
  className?: string;
  rows?: number;
  autoFocus?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onBlur,
  onMention,
  members,
  placeholder,
  className,
  rows = 2,
  autoFocus,
}: MentionInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    member.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const checkForMention = useCallback((text: string, cursorPos: number) => {
    // Find the @ symbol before cursor
    let start = cursorPos - 1;
    while (start >= 0 && text[start] !== '@' && text[start] !== ' ' && text[start] !== '\n') {
      start--;
    }
    
    if (start >= 0 && text[start] === '@') {
      const searchText = text.slice(start + 1, cursorPos);
      // Check if there's no space before @ or it's at the start
      const charBefore = start > 0 ? text[start - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || start === 0) {
        setMentionStartPos(start);
        setMentionSearch(searchText);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionStartPos(-1);
    setMentionSearch('');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);
    checkForMention(newValue, cursorPos);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(i => (i + 1) % filteredMembers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredMembers.length > 0) {
        e.preventDefault();
        selectMember(filteredMembers[suggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectMember = (member: Profile) => {
    if (mentionStartPos < 0) return;
    
    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(mentionStartPos + mentionSearch.length + 1);
    const mentionText = `@${member.name || member.email} `;
    
    const newValue = beforeMention + mentionText + afterMention;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionStartPos(-1);
    setMentionSearch('');
    
    // Notify parent about the mention
    if (onMention) {
      onMention(member.id, member.name || member.email || '');
    }
    
    // Focus back and set cursor position
    if (textareaRef.current) {
      const newCursorPos = beforeMention.length + mentionText.length;
      textareaRef.current.focus();
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        rows={rows}
        autoFocus={autoFocus}
      />
      
      {showSuggestions && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg"
        >
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left",
                    index === suggestionIndex ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => selectMember(member)}
                  onMouseEnter={() => setSuggestionIndex(index)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name || t('common.user')}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Helper to extract mentions from text
export function extractMentions(text: string, members: Profile[]): Profile[] {
  const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)?)/g;
  const mentions: Profile[] = [];
  let match;
  
  while ((match = mentionPattern.exec(text)) !== null) {
    const mentionName = match[1];
    const member = members.find(m => 
      m.name?.toLowerCase() === mentionName.toLowerCase() ||
      m.email?.toLowerCase() === mentionName.toLowerCase()
    );
    if (member && !mentions.find(m => m.id === member.id)) {
      mentions.push(member);
    }
  }
  
  return mentions;
}
