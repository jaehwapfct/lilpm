import React, { useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TeamSwitchingOverlay } from './TeamSwitchingOverlay';
import { CursorPresence, CollaborationToast } from '@/components/collaboration';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useTeamStore } from '@/stores/teamStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  enableCollaboration?: boolean;
}

export function AppLayout({ 
  children, 
  showSidebar = true,
  enableCollaboration = true,
}: AppLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSwitchingTeam, switchingToTeamName } = useTeamStore();
  
  // Initialize real-time collaboration
  const { isConnected, onlineCount } = useRealtimeCollaboration({
    enabled: enableCollaboration,
  });

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Team Switching Overlay */}
      <TeamSwitchingOverlay 
        isVisible={isSwitchingTeam} 
        teamName={switchingToTeamName || ''} 
      />
      
      {/* Desktop Sidebar */}
      {showSidebar && !isMobile && <Sidebar />}
      
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
      
      {/* Render cursors of other users */}
      {enableCollaboration && <CursorPresence />}
      
      {/* Collaboration toast notifications */}
      {enableCollaboration && <CollaborationToast />}
    </div>
  );
}
