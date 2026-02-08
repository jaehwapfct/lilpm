import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TeamSwitchingOverlay } from './TeamSwitchingOverlay';
import { CursorPresence, CollaborationToast } from '@/components/collaboration';
import { InboxToast } from './InboxToast';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useTeamStore } from '@/stores/teamStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  enableCollaboration?: boolean;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 224; // 14rem = 224px
const COLLAPSED_SIDEBAR_WIDTH = 0;

export function AppLayout({
  children,
  showSidebar = true,
  enableCollaboration = true,
}: AppLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSwitchingTeam, switchingToTeamName } = useTeamStore();

  // Sidebar collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() =>
    localStorage.getItem('sidebarCollapsed') === 'true'
  );

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);

  // Initialize real-time collaboration
  const { isConnected, onlineCount } = useRealtimeCollaboration({
    enabled: enableCollaboration,
  });

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Handle sidebar resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  const actualSidebarWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Team Switching Overlay */}
      <TeamSwitchingOverlay
        isVisible={isSwitchingTeam}
        teamName={switchingToTeamName || ''}
      />

      {/* Desktop Sidebar with Resize Handle */}
      {showSidebar && !isMobile && (
        <div
          className={cn(
            "relative flex-shrink-0 bg-sidebar flex transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed && "w-0"
          )}
          style={{ width: isCollapsed ? 0 : sidebarWidth }}
        >
          <Sidebar style={{ width: sidebarWidth, minWidth: sidebarWidth }} />

          {/* Resize Handle */}
          {!isCollapsed && (
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20",
                "hover:bg-primary/50 transition-colors",
                isResizing && "bg-primary/50"
              )}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>
      )}

      {/* Sidebar Toggle Button - Always visible on desktop */}
      {showSidebar && !isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 z-30 h-8 w-8 transition-all duration-300",
            isCollapsed ? "left-3" : "left-3"
          )}
          style={{ left: isCollapsed ? 12 : sidebarWidth - 36 }}
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Mobile Sidebar Sheet */}
      {showSidebar && isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          isCollaborating={isConnected}
          onlineCount={onlineCount}
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={isMobile && showSidebar}
        />
        <main ref={mainRef} className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>

      {/* CursorPresence disabled - use CollaborationCursor in BlockEditor instead */}
      {/* {enableCollaboration && <CursorPresence />} */}

      {/* Collaboration toast notifications */}
      {enableCollaboration && <CollaborationToast />}

      {/* Inbox notification toasts */}
      <InboxToast />
    </div>
  );
}
