import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Crown, Shield, User } from 'lucide-react';
import type { Profile } from '@/types/database';

interface MemberWithRole {
  profile: Profile;
  role: 'owner' | 'admin' | 'member' | 'guest';
  issueCount?: number;
}

interface ProjectMembersListProps {
  members: MemberWithRole[];
  onInvite?: () => void;
  className?: string;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  guest: User,
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  member: 'bg-muted text-muted-foreground',
  guest: 'bg-muted text-muted-foreground',
};

export function ProjectMembersList({ members, onInvite, className }: ProjectMembersListProps) {
  const { t } = useTranslation();

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('projects.members')} ({members.length})
          </CardTitle>
          {onInvite && (
            <Button variant="outline" size="sm" onClick={onInvite} className="gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              {t('team.inviteMember')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('team.noMembers')}</p>
          </div>
        ) : (
          members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role] || User;
            
            return (
              <div 
                key={member.profile.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.name || ''} />
                  <AvatarFallback>
                    {member.profile.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {member.profile.name || t('common.user')}
                    </span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 ${ROLE_COLORS[member.role]}`}>
                      <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                      {t(`team.${member.role}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile.email}
                  </p>
                </div>

                {member.issueCount !== undefined && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{member.issueCount}</p>
                    <p className="text-xs text-muted-foreground">{t('issues.title')}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
