# 프론트엔드 아키텍처

> React 18 + TypeScript + Vite 기반 SPA

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| **Framework** | React 18.3 |
| **Language** | TypeScript 5.5 |
| **Build** | Vite 5.4 |
| **Styling** | TailwindCSS 3.4 + shadcn/ui (Radix UI) |
| **State** | Zustand 5.0 |
| **Server State** | TanStack Query 5.83 |
| **Routing** | React Router DOM 6.30 |
| **Forms** | React Hook Form + Zod |
| **i18n** | i18next + react-i18next |
| **Editor** | TipTap 3.19 |
| **Collaboration** | Yjs 13.6 + Liveblocks + Supabase Realtime |
| **Charts** | Recharts |
| **DnD** | @dnd-kit |
| **Testing** | Vitest + Testing Library |

## 디렉토리 구조

```
src/
├── App.tsx                      # 라우팅 설정 (40+ 라우트)
├── main.tsx                     # 엔트리 포인트 (테마 초기화)
├── i18n.ts                      # i18next 설정 (en/ko)
│
├── components/                  # 재사용 컴포넌트 (Presentational)
│   ├── ui/                      # shadcn/ui 컴포넌트 (111+ 파일)
│   │   ├── advanced/            # calendar, carousel, chart, command, mention-input
│   │   ├── display/             # avatar, badge, card, progress, skeleton, table
│   │   ├── feedback/            # alert, alert-dialog, toast, sonner
│   │   ├── forms/               # button, input, select, checkbox, radio, switch, textarea
│   │   ├── layout/              # accordion, collapsible, resizable, scroll-area, sidebar
│   │   ├── navigation/          # tabs, breadcrumb, dropdown-menu, context-menu, pagination
│   │   └── overlay/             # dialog, sheet, drawer, popover, tooltip, hover-card
│   ├── editor/                  # TipTap 블록 에디터
│   │   ├── BlockEditor/         # 코어 에디터 + SlashCommandsMenu
│   │   ├── extensions/          # 에디터 확장
│   │   │   ├── blocks/          # Callout, Equation
│   │   │   ├── database/        # 데이터베이스 임베드
│   │   │   ├── interactive/     # 인터랙티브 블록
│   │   │   ├── layout/          # 레이아웃 블록
│   │   │   └── media/           # 미디어 블록
│   │   ├── ResizableImage.tsx   # 이미지 리사이즈
│   │   ├── CommentPanel.tsx     # 댓글 패널
│   │   ├── VersionHistoryPanel.tsx # 버전 히스토리
│   │   └── CursorOverlay.tsx    # 원격 커서 표시
│   ├── collaboration/           # 실시간 협업 UI
│   │   ├── PresenceAvatars.tsx  # 접속자 아바타
│   │   ├── CursorPresence.tsx   # 커서 프레즌스
│   │   ├── EditingIndicator.tsx # 편집 중 표시
│   │   └── OnlineUsersPanel.tsx # 온라인 유저 패널
│   ├── cycles/                  # BurndownChart, CycleIssueModal
│   ├── dashboard/               # 10+ 위젯 카드
│   ├── layout/                  # AppLayout, Sidebar, Header
│   ├── lily/                    # Lily AI 컴포넌트
│   ├── notifications/           # NotificationDropdown
│   ├── prd/                     # VersionHistoryPanel
│   ├── profile/                 # ProfileStats, ActivityChart, ActivityHistory
│   ├── projects/                # ProjectCard 등
│   ├── search/                  # GlobalSearch
│   ├── shortcuts/               # ShortcutHelpDialog
│   ├── team/                    # ProjectAssignmentModal 등
│   └── landing/                 # ProductDemoShowcase
│
├── features/                    # 기능 모듈 (Feature-based architecture)
│   ├── issues/                  # 이슈 관리
│   │   ├── components/          # GanttChart, IssueCard, IssueList, kanban, modals
│   │   ├── pages/               # IssuesPage, IssueDetailPage, MyIssuesPage, ArchivePage
│   │   ├── services/            # issueService, commentService, dependencyService, labelService
│   │   ├── adapters/            # IssuesDatabaseAdapter (DB뷰 연동)
│   │   └── store.ts             # useIssueStore (Zustand)
│   ├── lily/                    # Lily AI
│   │   ├── api/                 # lilyApi.ts
│   │   ├── components/          # LilyChat, ChatMessage, panels
│   │   ├── pages/               # LilyPage
│   │   ├── store.ts             # useLilyStore
│   │   └── utils/               # chatStream, mcpUtils
│   ├── prd/                     # PRD 관리
│   │   ├── pages/               # PRDPage, PRDDetailPage
│   │   ├── services/            # prdService, prdVersionService
│   │   └── types/               # PRDTypes
│   ├── projects/                # 프로젝트 관리
│   │   ├── components/          # ProjectCard, Modals, StatsCard, ProgressChart
│   │   ├── pages/               # ProjectsPage, ProjectDetailPage
│   │   └── services/            # projectService, projectMemberService
│   └── team/                    # 팀 관리
│       ├── components/          # ProjectAssignmentModal
│       └── pages/               # TeamMembersPage, TeamSettingsPage
│
├── hooks/                       # 커스텀 훅
│   ├── collaboration/           # useSupabaseCollaboration, useCloudflareCollaboration, useRealtimeCollaboration
│   ├── data/                    # useAISettings, useAutoSave, useTeamRealtime
│   ├── ui/                      # UI 관련 훅
│   ├── useKeyboardShortcuts.ts  # 전역 키보드 단축키
│   ├── useOfflineSync.ts        # 오프라인 동기화
│   ├── usePageHistory.ts        # 페이지 히스토리
│   └── useSidebarPresence.ts    # 사이드바 프레즌스
│
├── lib/                         # 유틸리티 및 서비스
│   ├── api/                     # REST API 클라이언트
│   │   ├── client.ts            # HTTP 클라이언트 (apiClient, lilyClient)
│   │   ├── authApi.ts           # 인증 API
│   │   ├── issueApi.ts          # 이슈 API
│   │   ├── teamApi.ts           # 팀 API
│   │   ├── projectApi.ts        # 프로젝트 API
│   │   ├── labelCycleApi.ts     # 라벨/사이클 API
│   │   └── collaborationClient.ts # WebSocket 클라이언트
│   ├── collaboration/           # 협업 유틸리티
│   ├── services/                # Supabase 직접 쿼리 서비스
│   │   ├── team/                # teamService, teamMemberService, teamInviteService, profileService
│   │   ├── activityService.ts
│   │   ├── blockCommentService.ts
│   │   ├── conversationService.ts
│   │   ├── cycleService.ts
│   │   └── notificationService.ts
│   ├── utils/                   # 유틸리티
│   │   ├── blockLinkUtils.ts
│   │   └── markdownToHTML.ts
│   ├── supabase.ts              # Supabase 클라이언트 초기화
│   └── utils.ts                 # cn() 등 공용 유틸
│
├── pages/                       # 독립 페이지 컴포넌트
│   ├── auth/                    # 인증 페이지 (8개)
│   ├── onboarding/              # 온보딩 (CreateTeam, CreateProject, AISetup)
│   ├── settings/                # 설정 (9개 - General, AI, MCP, LLM, GitHub, Slack, Notifications, Security, Profile)
│   ├── hooks/                   # Database 컴포넌트 (20+ 파일 - Notion-style DB)
│   ├── DashboardPage.tsx
│   ├── DatabasePage.tsx
│   ├── CyclesPage.tsx
│   ├── InboxPage.tsx
│   └── LandingPage.tsx
│
├── stores/                      # Zustand 전역 스토어 (10개)
├── locales/                     # i18n 번역 (en.json, ko.json)
├── types/                       # TypeScript 타입 정의
└── test/                        # 테스트 유틸리티
```

## 라우팅

### 전체 라우트 목록

```tsx
// App.tsx

// === 공개 라우트 ===
<Route path="/welcome" element={<LandingPage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
<Route path="/reset-password/expired" element={<ExpiredLinkPage />} />
<Route path="/invite/accept" element={<AcceptInvitePage />} />
<Route path="/invite/cancelled" element={<CancelledInvitePage />} />
<Route path="/lily/shared/:token" element={<SharedConversationPage />} />

// === 온보딩 (인증 필요) ===
<Route path="/onboarding/create-team" element={<CreateTeamPage />} />
<Route path="/onboarding/create-project" element={<CreateProjectPage />} />
<Route path="/onboarding/ai-setup" element={<AISetupPage />} />

// === 보호된 라우트 (인증 + 온보딩 완료) ===
<Route path="/dashboard" element={<DashboardPage />} />
<Route path="/issues" element={<IssuesPage />} />
<Route path="/issue/:issueId" element={<IssueDetailPage />} />
<Route path="/my-issues" element={<MyIssuesPage />} />
<Route path="/archive" element={<ArchivePage />} />
<Route path="/lily" element={<LilyPage />} />
<Route path="/prd" element={<PRDPage />} />
<Route path="/prd/:prdId" element={<PRDDetailPage />} />
<Route path="/projects" element={<ProjectsPage />} />
<Route path="/project/:projectId" element={<ProjectDetailPage />} />
<Route path="/cycles" element={<CyclesPage />} />
<Route path="/cycle/:cycleId" element={<IssuesPage />} />
<Route path="/team/members" element={<TeamMembersPage />} />
<Route path="/team/settings" element={<TeamSettingsPage />} />
<Route path="/database" element={<DatabasePage />} />
<Route path="/inbox" element={<InboxPage />} />
<Route path="/notifications" element={<NotificationsPage />} />
<Route path="/help" element={<HelpPage />} />
<Route path="/settings" element={<GeneralSettingsPage />} />
<Route path="/settings/ai" element={<AISettingsPage />} />
<Route path="/settings/mcp" element={<MCPSettingsPage />} />
<Route path="/settings/llm" element={<LLMSettingsPage />} />
<Route path="/settings/github" element={<GitHubSettingsPage />} />
<Route path="/settings/slack" element={<SlackSettingsPage />} />
<Route path="/settings/notifications" element={<NotificationSettingsPage />} />
<Route path="/settings/security" element={<SecuritySettingsPage />} />
<Route path="/profile" element={<ProfilePage />} />
```

### 라우트 가드

| 가드 | 역할 |
|------|------|
| `AuthRoute` | 미인증 유저만 접근 (로그인/회원가입) |
| `ProtectedRoute` | 인증 필수 |
| `OnboardingCheck` | 이메일 인증 + 팀 존재 확인 |

```tsx
// 리디렉션 로직
if (!isEmailVerified && teams.length === 0) → /auth/verify-email
if (teams.length === 0 && !onboardingCompleted) → /welcome
```

## 상태 관리

### Zustand 스토어

| 스토어 | 위치 | 주요 상태 | Persist |
|--------|------|-----------|:-------:|
| `authStore` | `stores/authStore.ts` | user, isAuthenticated, isEmailVerified | - |
| `teamStore` | `stores/teamStore.ts` | teams, currentTeam, members, projects | - |
| `issueStore` | `features/issues/store.ts` | issues, filters, isLoading | - |
| `lilyStore` | `features/lily/store.ts` | conversations, messages, isStreaming | - |
| `collaborationStore` | `stores/collaborationStore.ts` | isConnected, users, myPresence | - |
| `notificationStore` | `stores/notificationStore.ts` | notifications, unreadCount | - |
| `mcpStore` | `stores/mcpStore.ts` | onboardingCompleted, MCP config | - |
| `themeStore` | `stores/themeStore.ts` | theme (light/dark/system) | Yes |
| `languageStore` | `stores/languageStore.ts` | language (en/ko) | Yes |
| `integrationStore` | `stores/integrationStore.ts` | GitHub, Slack settings | - |
| `notificationSettingsStore` | `stores/notificationSettingsStore.ts` | 알림 환경설정 | - |

### 패턴

```tsx
// 선택적 구독 (성능 최적화)
const user = useAuthStore((state) => state.user);
const isLoading = useAuthStore((state) => state.isLoading);

// 액션 호출
const { createIssue } = useIssueStore();
await createIssue(teamId, issueData);
```

## 코드 스플리팅

### React.lazy 페이지 로딩

```typescript
const DashboardPage = React.lazy(() =>
  import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage }))
);
```

### 즉시 로드 (Critical Path)
- Auth 페이지 (Login, Signup)
- LandingPage
- Onboarding 페이지

### 지연 로드 (On Navigation)
- DashboardPage, IssuesPage, PRDPage, LilyPage
- 모든 Settings 페이지
- 기타 기능 페이지

## 스타일링

### TailwindCSS + shadcn/ui

```tsx
// cn() 유틸리티로 조건부 클래스
<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-primary text-primary-foreground",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>

// shadcn/ui 컴포넌트
<Button variant="default" size="sm">클릭</Button>
<Dialog><DialogTrigger>...</DialogTrigger><DialogContent>...</DialogContent></Dialog>
```

### 다크 모드

```tsx
// themeStore로 테마 관리
const { theme, setTheme } = useThemeStore();
// 'light' | 'dark' | 'system'
```

### 디자인 시스템

Linear 스타일 색상 테마 사용 (tailwind.config.ts에서 커스텀 정의)

## 다국어 (i18n)

```typescript
// i18n.ts - i18next 설정
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 사용
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

지원 언어: **영어** (`en.json`), **한국어** (`ko.json`)

---

**관련 문서**
- [데이터베이스 스키마](./database.md)
- [API 설계](./api.md)
- [Zustand 스토어](./stores.md)
- [서비스 레이어](./services.md)
