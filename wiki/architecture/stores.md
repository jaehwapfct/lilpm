# 🗃️ Zustand 스토어

> 전역 상태 관리를 위한 Zustand 스토어 구조

## 개요

LilPM은 **Zustand**를 사용하여 전역 상태를 관리합니다. 각 도메인별로 독립된 스토어를 유지합니다.

**디렉토리**: `src/stores/`

---

## 핵심 스토어

### authStore

**파일**: `src/stores/authStore.ts`

사용자 인증 상태 관리

```typescript
const { user, isAuthenticated, signIn, signOut, checkAuth } = useAuthStore();
```

| 상태 | 타입 | 설명 |
|------|------|------|
| `user` | User \| null | 현재 로그인 사용자 |
| `isAuthenticated` | boolean | 로그인 여부 |
| `isLoading` | boolean | 인증 확인 중 |

---

### teamStore

**파일**: `src/stores/teamStore.ts`

팀 선택 및 전환 관리

```typescript
const { 
  currentTeam, 
  teams, 
  selectTeam, 
  loadTeams, 
  createTeam 
} = useTeamStore();
```

| 상태 | 타입 | 설명 |
|------|------|------|
| `currentTeam` | Team \| null | 현재 선택된 팀 |
| `teams` | Team[] | 사용자가 속한 팀 목록 |
| `isLoading` | boolean | 팀 로딩 중 |

---

### issueStore

**파일**: `src/stores/issueStore.ts`

이슈 목록 및 필터 관리

```typescript
const { 
  issues,
  filters,
  setFilters,
  loadIssues,
  createIssue,
  updateIssue
} = useIssueStore();
```

| 상태 | 타입 | 설명 |
|------|------|------|
| `issues` | Issue[] | 이슈 목록 |
| `filters` | IssueFilters | 현재 필터 상태 |
| `groupBy` | string | 그룹화 기준 |
| `sortBy` | string | 정렬 기준 |

---

### lilyStore

**파일**: `src/stores/lilyStore.ts`

Lily AI 채팅 상태 관리 (가장 큰 스토어)

```typescript
const { 
  messages,
  conversations,
  currentConversation,
  sendMessage,
  generatePRD,
  generateTickets
} = useLilyStore();
```

| 상태 | 타입 | 설명 |
|------|------|------|
| `messages` | Message[] | 현재 대화 메시지 |
| `conversations` | Conversation[] | 대화 목록 |
| `isStreaming` | boolean | AI 응답 스트리밍 중 |
| `aiSettings` | AISettings | AI 제공자 설정 |

**주요 액션**:
- `sendMessage(content, options?)` - 메시지 전송 및 AI 응답 받기
- `generatePRD(description)` - PRD 생성 요청
- `generateTickets(prdContent)` - PRD에서 티켓 생성

---

### notificationStore

**파일**: `src/stores/notificationStore.ts`

알림 (인박스) 상태 관리

```typescript
const { 
  notifications,
  unreadCount,
  loadNotifications,
  markAsRead 
} = useNotificationStore();
```

---

### collaborationStore

**파일**: `src/stores/collaborationStore.ts`

실시간 협업 상태 (Liveblocks/Yjs)

```typescript
const { 
  isConnected,
  activeUsers,
  connect,
  disconnect 
} = useCollaborationStore();
```

---

### themeStore

**파일**: `src/stores/themeStore.ts`

테마 설정 (라이트/다크)

```typescript
const { theme, setTheme } = useThemeStore();
```

---

### languageStore

**파일**: `src/stores/languageStore.ts`

언어 설정 (i18n)

```typescript
const { language, setLanguage } = useLanguageStore();
```

---

## 스토어 구조

```
stores/
├── authStore.ts          # 인증 상태
├── teamStore.ts          # 팀 선택
├── issueStore.ts         # 이슈 관리
├── lilyStore.ts          # AI 채팅 (34KB - 가장 큼)
├── notificationStore.ts  # 알림
├── collaborationStore.ts # 실시간 협업
├── mcpStore.ts          # MCP 연결
├── integrationStore.ts   # 외부 연동
├── themeStore.ts        # 테마
├── languageStore.ts     # 언어
├── notificationSettingsStore.ts
└── index.ts             # 배럴 익스포트
```

---

## 사용 패턴

### 컴포넌트에서 사용

```tsx
import { useAuthStore, useTeamStore } from '@/stores';

function MyComponent() {
  const { user } = useAuthStore();
  const { currentTeam, teams } = useTeamStore();
  
  // ...
}
```

### 선택적 구독 (성능 최적화)

```tsx
// 전체 상태 대신 필요한 부분만 구독
const user = useAuthStore((state) => state.user);
const isLoading = useAuthStore((state) => state.isLoading);
```

---

## Persist (영속성)

일부 스토어는 localStorage에 저장됩니다:

```typescript
// themeStore.ts
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'theme-storage' }
  )
);
```

영속화된 스토어:
- `themeStore` - 테마 설정
- `languageStore` - 언어 설정

---

**관련 문서**
- [서비스 레이어](./services.md)
- [프론트엔드 구조](./frontend.md)
