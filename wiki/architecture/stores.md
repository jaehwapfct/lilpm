# Zustand 스토어

> 전역 상태 관리를 위한 Zustand 스토어 구조

## 개요

LilPM은 **Zustand 5.0**을 사용하여 전역 상태를 관리합니다. 도메인별로 독립된 스토어를 유지하며, 일부는 feature 모듈 내에 위치합니다.

## 스토어 맵

```
stores/                          # 전역 스토어
├── authStore.ts                 # 인증 상태
├── teamStore.ts                 # 팀 + 프로젝트 관리
├── collaborationStore.ts        # 실시간 협업
├── notificationStore.ts         # 알림 (인박스)
├── mcpStore.ts                  # MCP 설정
├── themeStore.ts                # 테마 (light/dark/system)
├── languageStore.ts             # 언어 (en/ko)
├── integrationStore.ts          # 외부 연동 (GitHub, Slack)
├── notificationSettingsStore.ts # 알림 환경설정
└── index.ts                     # 배럴 익스포트

features/issues/store.ts         # 이슈 상태 (Feature 스토어)
features/lily/store.ts           # Lily AI 대화 상태 (Feature 스토어)
```

---

## 핵심 스토어

### authStore

**파일**: `src/stores/authStore.ts`

인증 상태 관리 (Supabase Auth)

| 상태 | 타입 | 설명 |
|------|------|------|
| `user` | User \| null | 현재 로그인 사용자 |
| `isAuthenticated` | boolean | 로그인 여부 |
| `isLoading` | boolean | 인증 확인 중 |
| `isEmailVerified` | boolean | 이메일 인증 완료 여부 |

| 액션 | 설명 |
|------|------|
| `login(email, password)` | 이메일/비밀번호 로그인 |
| `signup(email, password, name)` | 회원가입 (이메일 인증 리디렉트 포함) |
| `logout()` | 로그아웃 |
| `loadUser()` | 세션 확인 + `onAuthStateChange` 리스너 설정 |
| `updateUser(data)` | 프로필 업데이트 |
| `resendVerificationEmail()` | 인증 이메일 재발송 |

---

### teamStore

**파일**: `src/stores/teamStore.ts`

팀 및 프로젝트 관리 (가장 많은 액션 보유)

| 상태 | 타입 | 설명 |
|------|------|------|
| `teams` | Team[] | 사용자가 속한 팀 목록 |
| `currentTeam` | Team \| null | 현재 선택된 팀 |
| `members` | TeamMember[] | 현재 팀 멤버 목록 |
| `projects` | Project[] | 현재 팀 프로젝트 목록 |
| `isLoading` | boolean | 로딩 중 |
| `isSwitchingTeam` | boolean | 팀 전환 중 |

| 액션 | 설명 |
|------|------|
| `loadTeams()` | 사용자의 팀 목록 로드 |
| `selectTeam(teamId)` | 팀 전환 |
| `createTeam(name, slug)` | 팀 생성 (RPC create_team_with_owner) |
| `updateTeam(teamId, data)` | 팀 수정 |
| `deleteTeam(teamId)` | 팀 삭제 |
| `loadMembers()` | 팀 멤버 로드 |
| `inviteMember(email, role)` | 멤버 초대 |
| `removeMember(memberId)` | 멤버 제거 |
| `updateMemberRole(memberId, role)` | 역할 변경 |
| `loadProjects()` | 프로젝트 목록 로드 |
| `createProject(data)` | 프로젝트 생성 |
| `updateProject(projectId, data)` | 프로젝트 수정 |
| `deleteProject(projectId)` | 프로젝트 삭제 |

---

### issueStore (Feature 스토어)

**파일**: `src/features/issues/store.ts`

이슈 목록 및 필터 관리

| 상태 | 타입 | 설명 |
|------|------|------|
| `issues` | Issue[] | 이슈 목록 |
| `filters` | IssueFilters | 현재 필터 (status, priority, assignee, project) |
| `isLoading` | boolean | 로딩 중 |
| `groupBy` | string | 그룹화 기준 |
| `sortBy` | string | 정렬 기준 |

| 액션 | 설명 |
|------|------|
| `loadIssues(teamId, filters?)` | 이슈 목록 로드 |
| `createIssue(teamId, data)` | 이슈 생성 |
| `updateIssue(issueId, data)` | 이슈 수정 |
| `deleteIssue(issueId)` | 이슈 삭제 |
| `archiveIssues(issueIds)` | 이슈 아카이브 |
| `createDependency(blocking, blocked)` | 의존성 생성 |
| `deleteDependency(dependencyId)` | 의존성 삭제 |

---

### lilyStore (Feature 스토어)

**파일**: `src/features/lily/store.ts`

Lily AI 채팅 상태 관리

| 상태 | 타입 | 설명 |
|------|------|------|
| `conversations` | Conversation[] | 대화 목록 |
| `currentConversation` | Conversation \| null | 현재 대화 |
| `messages` | Message[] | 현재 대화 메시지 |
| `isStreaming` | boolean | AI 응답 스트리밍 중 |
| `aiSettings` | AISettings | AI 제공자 설정 |

| 액션 | 설명 |
|------|------|
| `sendMessage(content, options?)` | 메시지 전송 + AI 응답 |
| `generatePRD(description)` | PRD 생성 요청 |
| `generateTickets(prdContent)` | PRD에서 티켓 생성 |
| `loadConversations()` | 대화 목록 로드 |
| `selectConversation(id)` | 대화 선택 |
| `deleteConversation(id)` | 대화 삭제 |
| `pinConversation(id)` | 대화 고정/해제 |

---

### collaborationStore

**파일**: `src/stores/collaborationStore.ts`

실시간 협업 상태 (Supabase Realtime Presence)

| 상태 | 타입 | 설명 |
|------|------|------|
| `isConnected` | boolean | 채널 연결 상태 |
| `roomId` | string | 현재 방 ID |
| `users` | PresenceUser[] | 접속 중인 유저 목록 |
| `myPresence` | Presence | 내 프레즌스 정보 |
| `showCursors` | boolean | 커서 표시 여부 |
| `followingUserId` | string \| null | 팔로우 중인 유저 |

---

### notificationStore

**파일**: `src/stores/notificationStore.ts`

알림 (인박스) 상태

| 상태 | 타입 | 설명 |
|------|------|------|
| `notifications` | Notification[] | 알림 목록 |
| `unreadCount` | number | 읽지 않은 알림 수 |

| 액션 | 설명 |
|------|------|
| `loadNotifications()` | 알림 목록 로드 |
| `markAsRead(id)` | 읽음 처리 |
| `markAllAsRead()` | 전체 읽음 |

---

### mcpStore

**파일**: `src/stores/mcpStore.ts`

MCP (Model Context Protocol) 설정

| 상태 | 타입 | 설명 |
|------|------|------|
| `onboardingCompleted` | boolean | 온보딩 완료 여부 |
| MCP 서버 설정 | object | 연결된 MCP 서버 목록 |

---

### themeStore (Persist)

**파일**: `src/stores/themeStore.ts`

```typescript
export const useThemeStore = create(
  persist((set) => ({
    theme: 'system' as 'light' | 'dark' | 'system',
    setTheme: (theme) => set({ theme }),
  }), { name: 'theme-storage' })
);
```

### languageStore (Persist)

**파일**: `src/stores/languageStore.ts`

```typescript
export const useLanguageStore = create(
  persist((set) => ({
    language: 'en' as 'en' | 'ko',
    setLanguage: (language) => { set({ language }); i18n.changeLanguage(language); },
  }), { name: 'language-storage' })
);
```

### integrationStore

**파일**: `src/stores/integrationStore.ts`

외부 서비스 연동 (GitHub, Slack) 설정 관리

### notificationSettingsStore

**파일**: `src/stores/notificationSettingsStore.ts`

사용자별 알림 환경설정 (어떤 유형의 알림을 받을지)

---

## 사용 패턴

```tsx
// 컴포넌트에서 사용
import { useAuthStore } from '@/stores';
import { useIssueStore } from '@/features/issues/store';

function MyComponent() {
  const { user } = useAuthStore();
  const { issues, loadIssues } = useIssueStore();

  useEffect(() => { loadIssues(teamId); }, [teamId]);
}
```

---

**관련 문서**
- [서비스 레이어](./services.md)
- [프론트엔드 구조](./frontend.md)
