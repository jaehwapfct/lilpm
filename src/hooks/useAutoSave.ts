import { useCallback, useRef, useEffect, useState } from 'react';

interface UseAutoSaveOptions {
  onSave: (value: string) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave({ onSave, delay = 1000, enabled = true }: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const initialValueRef = useRef<string | null>(null);

  const save = useCallback(async (value: string) => {
    if (!enabled) return;
    
    setIsSaving(true);
    try {
      await onSave(value);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      initialValueRef.current = value;
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, enabled]);

  const debouncedSave = useCallback((value: string) => {
    if (!enabled) return;

    pendingValueRef.current = value;
    
    // Check if value has actually changed from initial
    if (initialValueRef.current !== null && value === initialValueRef.current) {
      setHasUnsavedChanges(false);
      return;
    }
    
    setHasUnsavedChanges(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingValueRef.current !== null) {
        save(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }, delay);
  }, [save, delay, enabled]);

  const setInitialValue = useCallback((value: string) => {
    initialValueRef.current = value;
    setHasUnsavedChanges(false);
  }, []);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pendingValueRef.current !== null) {
      await save(pendingValueRef.current);
      pendingValueRef.current = null;
    }
  }, [save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    debouncedSave,
    saveNow,
    setInitialValue,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };
}
