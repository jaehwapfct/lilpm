import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

interface AutoSaveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onSave: (value: string) => Promise<void>;
  saveDelay?: number;
  showSaveIndicator?: boolean;
  inputClassName?: string;
}

export function AutoSaveInput({
  value: initialValue,
  onSave,
  saveDelay = 1000,
  showSaveIndicator = true,
  className,
  inputClassName,
  ...props
}: AutoSaveInputProps) {
  const [value, setValue] = useState(initialValue);
  const { debouncedSave, setInitialValue, isSaving, hasUnsavedChanges, lastSaved } = useAutoSave({
    onSave,
    delay: saveDelay,
  });

  // Update value when initialValue changes externally
  useEffect(() => {
    setValue(initialValue);
    setInitialValue(initialValue);
  }, [initialValue, setInitialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        {...props}
        value={value}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm ring-offset-[#0d0d0f] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName
        )}
      />
      {showSaveIndicator && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : lastSaved && !hasUnsavedChanges ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      )}
    </div>
  );
}

interface AutoSaveTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onSave: (value: string) => Promise<void>;
  saveDelay?: number;
  showSaveIndicator?: boolean;
  textareaClassName?: string;
}

export function AutoSaveTextarea({
  value: initialValue,
  onSave,
  saveDelay = 1000,
  showSaveIndicator = true,
  className,
  textareaClassName,
  ...props
}: AutoSaveTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const { debouncedSave, setInitialValue, isSaving, hasUnsavedChanges, lastSaved } = useAutoSave({
    onSave,
    delay: saveDelay,
  });

  // Update value when initialValue changes externally
  useEffect(() => {
    setValue(initialValue);
    setInitialValue(initialValue);
  }, [initialValue, setInitialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <div className={cn("relative", className)}>
      <textarea
        {...props}
        value={value}
        onChange={handleChange}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm ring-offset-[#0d0d0f] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          textareaClassName
        )}
      />
      {showSaveIndicator && (
        <div className="absolute right-2 top-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : lastSaved && !hasUnsavedChanges ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      )}
    </div>
  );
}
