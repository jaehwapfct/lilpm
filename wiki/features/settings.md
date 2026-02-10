# 설정 페이지

> 앱, AI, 연동, 보안 설정을 관리하세요.

## 개요

설정은 9개 하위 페이지로 구성됩니다.

**디렉토리**: `src/pages/settings/`

## 설정 페이지 목록

| 라우트 | 파일 | 설명 |
|--------|------|------|
| `/settings` | `GeneralSettingsPage.tsx` | 일반 설정 (테마, 언어) |
| `/settings/ai` | `AISettingsPage.tsx` | AI 모델 설정 |
| `/settings/mcp` | `MCPSettingsPage.tsx` | MCP 서버 설정 |
| `/settings/llm` | `LLMSettingsPage.tsx` | LLM API 키 관리 |
| `/settings/github` | `GitHubSettingsPage.tsx` | GitHub 연동 |
| `/settings/slack` | `SlackSettingsPage.tsx` | Slack 연동 |
| `/settings/notifications` | `NotificationSettingsPage.tsx` | 알림 환경설정 |
| `/settings/security` | `SecuritySettingsPage.tsx` | 보안 (비밀번호 변경) |
| `/profile` | `ProfilePage.tsx` | 프로필 편집 |

## 주요 설정

### AI 설정 (`/settings/ai`)
- 기본 AI 프로바이더 선택 (Auto/Claude/GPT-4o/Gemini)
- Auto 모드 활성화/비활성화

### LLM 설정 (`/settings/llm`)
- API 키 관리 (Anthropic, OpenAI, Google)
- `user_ai_settings` 테이블에 저장

### MCP 설정 (`/settings/mcp`)
- MCP 서버 연결 관리
- 엔드포인트, API 키 설정
- `mcpStore`와 `useMCPSettingsHandlers` 훅 사용

### 알림 설정 (`/settings/notifications`)
- 알림 유형별 활성화/비활성화
- 이메일 알림 on/off
- `notificationSettingsStore` 사용

### 보안 (`/settings/security`)
- 비밀번호 변경
- 세션 관리

### 프로필 (`/profile`)
- 이름, 아바타 편집
- 활동 차트 (ProfileActivityChart)
- 기여 통계 (ProfileStats)
- 활동 히스토리 (ProfileActivityHistory)

---

**관련 문서**
- [Lily AI](./lily-ai.md)
- [MCP 통합](./mcp.md)
- [알림](./notifications.md)
