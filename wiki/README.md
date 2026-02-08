# 🎯 Lil PM - AI 기반 프로젝트 관리 플랫폼

> **Linear.app 클론** + **Lily AI** 를 활용한 차세대 프로젝트 관리 도구

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.io/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)

## 📚 문서 목차

### 기능 가이드
- [이슈 관리](./features/issues.md) - 이슈 생성, 상태 관리, PRD/사이클 연결
- [간트 차트](./features/gantt-chart.md) - 타임라인 뷰, 어사이니 필터, 의존성 연결
- [Lily AI](./features/lily-ai.md) - AI 어시스턴트, PRD/티켓 생성
- [PRD](./features/prd.md) - 블록 에디터, @멘션, 프로젝트 연결
- [사이클](./features/cycles.md) - 스프린트 관리
- [인증](./features/authentication.md) - 이메일 인증, /welcome 리디렉션
- [팀 멤버 관리](./features/team-members.md) - 초대 수락/거절 UI, Edge Functions

### 아키텍처
- [프론트엔드 구조](./architecture/frontend.md)
- [데이터베이스 스키마](./architecture/database.md) - RPC 함수, 마이그레이션, Edge Functions
- [API 설계](./architecture/api.md)

### 개발 가이드
- [환경 설정](./development/setup.md)
- [컨트리뷰션 가이드](./development/contributing.md)

---

## 🚀 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/jaehwapfct/lilpm.git
cd lilpm

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집하여 Supabase 키 입력

# 개발 서버 실행
npm run dev
```

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 🎫 **이슈 관리** | 백로그, 진행중, blocked, 완료 상태 관리, PRD/사이클 연결 |
| 📊 **간트 차트** | 드래그앤드롭 일정 조정, Jira 스타일 어사이니 필터 |
| 🤖 **Lily AI** | PRD/티켓 자동 생성, 대화형 기획 |
| 📝 **PRD** | 블록 에디터, @멘션 알림, 프로젝트 다중 연결 |
| 🔄 **사이클** | 스프린트 기반 프로젝트 관리 |
| 👥 **팀 협업** | 초대 수락/거절 UI, 권한 관리, 실시간 동기화 |
| 📧 **알림** | 인박스 + 이메일 알림 (@멘션, 초대) |

## 🛠️ 기술 스택

### 프론트엔드
- **React 18** + TypeScript
- **Vite** - 빌드 도구
- **TailwindCSS** + shadcn/ui - 스타일링
- **Zustand** - 상태 관리
- **TipTap** - 블록 에디터

### 백엔드
- **Supabase** - PostgreSQL + Auth + Storage + Realtime
- **Edge Functions** - AI API 프록시, 이메일 발송, 초대 미리보기

### AI
- **Claude (Anthropic)** - 기본 AI 모델
- **GPT-4o (OpenAI)** - 대체 모델
- **Gemini (Google)** - 대체 모델

## 📁 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── editor/         # 블록 에디터 (BlockEditor, ResizableImage)
│   ├── issues/         # 이슈 관련 (GanttChart, IssueCard, CreateIssueModal)
│   ├── layout/         # 레이아웃 (Sidebar, AppLayout)
│   └── lily/           # Lily AI 관련
├── hooks/              # 커스텀 훅
├── lib/                # 유틸리티, 서비스
│   └── services/       # API 서비스 (issueService, prdService, teamService)
├── pages/              # 페이지 컴포넌트
│   ├── auth/           # 인증 페이지 (AcceptInvitePage)
│   ├── onboarding/     # 온보딩 페이지
│   └── settings/       # 설정 페이지
├── stores/             # Zustand 스토어
└── types/              # TypeScript 타입 정의

supabase/
├── functions/          # Edge Functions
│   ├── get-invite-preview/  # 초대 미리보기 (--no-verify-jwt)
│   ├── send-team-invite/    # 초대 이메일 발송
│   ├── send-mention-email/  # @멘션 이메일 발송
│   └── lily-chat/           # AI 채팅
└── migrations/         # 데이터베이스 마이그레이션
```

## 🔐 환경 변수

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_URL=http://localhost:5173
```

## 🆕 최근 업데이트 (2026-02-08)

### UI/UX 개선
- ✅ **랜딩 페이지 히어로 애니메이션** - 8개 기능 3초 순환 쇼케이스
- ✅ **PRD 리스트 뷰** - 그리드/리스트 토글, 필터, 정렬 기능
- ✅ **사이드바 접기/펼치기** - localStorage 저장, 부드러운 전환

### 새로운 컴포넌트
- ✅ **ImageUploadModal** - 드래그앤드롭, 라이트박스, 10개 이미지 제한
- ✅ **InboxToast** - 실시간 알림 토스트 시스템

### 팀 기능
- ✅ **팀 탈퇴 기능** - 비 Owner 멤버 탈퇴, 확인 다이얼로그
- ✅ **초대 수락/거절 UI** - 자동 수락 대신 명시적 버튼 표시
- ✅ **get-invite-preview Edge Function** - 비인증 유저 초대 미리보기

### AI & 알림
- ✅ **CoT UI 조건부 표시** - 이미지 첨부 메시지에만 표시
- ✅ **PRD @멘션 알림** - 인박스 + 이메일 발송
- ✅ **이슈-PRD 연결** - IssueDetailPage에 PRD 선택기 추가

## 📜 라이선스

MIT License

---

**💡 더 자세한 내용은 각 문서 페이지를 참조하세요.**
