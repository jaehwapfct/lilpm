# 최근 기능 업데이트 로그

## 2026-02-10 (Evening) - Full Stack Refactoring

### Edge Functions 리팩토링
| 변경 | 설명 |
|------|------|
| `_shared/cors.ts` | 공유 CORS 설정 + preflight 핸들러 |
| `_shared/env.ts` | 중앙 집중식 환경 변수 관리 |
| `_shared/supabase.ts` | Admin 클라이언트 팩토리 |
| `_shared/email.ts` | Gmail SMTP + Resend API 자동 폴백 |
| `_shared/response.ts` | JSON 응답 헬퍼 (success, error, versioned) |
| `_shared/mod.ts` | 배럴 파일 |
| 9개 Edge Functions | 모두 `_shared` 모듈 사용으로 리팩토링 |
| `delete-users` | 독립 테이블 삭제를 `Promise.all()`로 병렬화 |
| `accept-invite-v2` | 프로필+멤버 조회 병렬화, 알림 이메일 `Promise.allSettled()` |

### DB 성능 인덱스
| 변경 | 설명 |
|------|------|
| `20260210160000_performance_indexes.sql` | 16개 새 성능 인덱스 (Composite, Partial, GIN) |
| `notifications` | `(user_id, read, created_at)` 복합 인덱스 |
| `issues` | `(project_id, status)` 파셜 인덱스 (active only) |
| `database_rows` | `properties` GIN 인덱스 (JSONB 쿼리 최대 100배 향상) |

### 프론트엔드 최적화
| 변경 | 설명 |
|------|------|
| `vite.config.ts` | 14개 그래뉼러 청크, ES2022, Lightning CSS, 의존성 프리번들링 |
| `App.tsx` | React Query 기본 설정 (staleTime, gcTime, retry, 지수 백오프) |
| `IssueRow.tsx` | `React.memo` 적용 |
| `IssueCard.tsx` | `React.memo` 적용 |
| `SidebarComponents.tsx` | `NavItem`, `ConversationListItem` `React.memo` 적용 |
| `tsconfig.app.json` | ES2022 타겟, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` |

> **상세 리포트**: [wiki/REFACTORING-2026-02-10.md](./REFACTORING-2026-02-10.md)

---

## 2026-02-10

### 초대 시스템 - 프로젝트별 할당
| 변경 | 설명 |
|------|------|
| `20260210150000_invite_project_ids.sql` | `team_invites`에 `project_ids UUID[]` 컬럼 추가 |
| `accept-invite-v2/index.ts` | 초대 수락 시 `project_ids` 기반 프로젝트 할당 정리 |

### Database 기능 확장
| 변경 | 설명 |
|------|------|
| `20260210160000_database_enhancements.sql` | `database_rows`에 `parent_id`, `position` 추가 (Sub-items), `database_properties`에 rollup 설정 추가 |
| `20260210170000_block_comment_reactions.sql` | `block_comment_reactions` 테이블 생성 (이모지 리액션) |

### accept-invite-v2 주요 로직
```
초대 수락 시:
1. 토큰으로 초대 조회
2. 만료 확인 (24시간)
3. 유저 인증 상태에 따라:
   A. 인증됨 → 직접 팀 멤버 추가
   B. 기존 유저 → 매직 링크 발송
   C. 신규 유저 → 회원가입 안내
4. project_ids가 있으면 선택된 프로젝트만 할당 (나머지 제거)
5. 알림 이메일 발송
```

---

## 2026-02-08

### 신규 파일
| 파일 | 설명 |
|------|------|
| `BlockPresenceIndicator.tsx` | 블록 편집 중인 사용자 아바타 표시 |
| `BlockPresence.css` | 아바타 위치/애니메이션 스타일 |
| `send-notification-email/index.ts` | 7가지 알림 유형 이메일 Edge Function |
| `20260208_create_databases.sql` | Database 테이블 마이그레이션 |
| `20260208171600_page_versions_and_comments.sql` | 페이지 버전 및 블록 댓글 |
| `20260208170700_archive_system.sql` | 아카이브 시스템 (issues, prd_documents) |
| `20260208190000_project_members.sql` | 프로젝트 멤버 시스템 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `useCloudflareCollaboration.ts` | RemoteCursor에 id, avatar, blockId 추가 |
| `BlockEditor.tsx` | BlockPresenceIndicator 통합 |
| `DatabasePage.tsx` | Supabase CRUD 연동 (loadDatabases, handleCreateDatabase, handleAddRow) |
| `en.json` / `ko.json` | database.* 번역 25개 키 |

### 완료된 항목
- 프로젝트 멤버 시스템 (RLS 기반 접근 제어)
- ProjectAssignmentModal (체크박스 기반 할당 UI)
- 자동 할당 트리거 (새 팀 멤버 → 기존 프로젝트 자동 할당)
- 팀 탈퇴 기능 (비 Owner 멤버 탈퇴, 확인 다이얼로그)
- 초대 수락/거절 UI (자동 수락 대신 명시적 버튼)
- get-invite-preview Edge Function
- Database 기능 (Notion-style)
- 이메일 알림 시스템 (7가지 유형)
- 블록 프레즌스 인디케이터

---

## 아키텍처 변경사항

### Database Feature (Notion-style)
```
databases
├── database_properties (컬럼/필드)
├── database_rows (레코드, parent_id로 Sub-items 지원)
└── database_views (뷰 설정)
```

### Email Notifications
```
알림 유형:
- issue_assigned
- issue_mentioned
- comment_added
- due_date_reminder
- status_changed
- team_invite
- prd_mentioned
```

### Block Presence
```
RemoteCursor {
  id, odId, name, color, avatar?, position, blockId?, lastUpdate
}
```

### Invite System v2
```
team_invites 테이블:
- project_ids UUID[] 컬럼 추가
- 초대 시 특정 프로젝트만 선택 가능
- 수락 시 auto-assign 후 불필요한 프로젝트 할당 제거
```

---

## 잠재적 미완료 항목
1. ImageUploadModal 실사용 연결
2. Owner 팀 이전 기능
3. 이메일 알림 실발송 검증
4. Yjs 기반 실시간 협업 활성화 (Cloudflare Worker 배포 필요)
