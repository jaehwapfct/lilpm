import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Keyboard shortcuts for the Sidebar.
 * - Cmd/Ctrl+K: open search
 * - G I: go to issues
 * - G M: go to my issues
 * - G S: go to settings
 * - L: go to lily
 */
export function useSidebarKeyboardShortcuts(
    setSearchOpen: (open: boolean) => void
) {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.closest('[role="dialog"]') !== null;

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }

            if (isTyping) return;

            if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                if (e.key === 'g') {
                    const handleNext = (e2: KeyboardEvent) => {
                        const target2 = e2.target as HTMLElement;
                        const isTyping2 = target2.tagName === 'INPUT' ||
                            target2.tagName === 'TEXTAREA' ||
                            target2.isContentEditable ||
                            target2.closest('[role="dialog"]') !== null;
                        if (isTyping2) return;

                        if (e2.key === 'i') navigate('/issues');
                        if (e2.key === 'm') navigate('/my-issues');
                        if (e2.key === 's') navigate('/settings');
                        if (e2.key === 'a') navigate('/issues');
                        window.removeEventListener('keydown', handleNext);
                    };
                    window.addEventListener('keydown', handleNext, { once: true });
                    setTimeout(() => window.removeEventListener('keydown', handleNext), 500);
                }
                if (e.key === 'l' && document.activeElement?.tagName !== 'INPUT') {
                    navigate('/lily');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, setSearchOpen]);
}
