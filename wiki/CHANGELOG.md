# 최근 기능 업데이트 로그

## 2026-02-08

### 신규 파일
| 파일 | 설명 |
|------|------|
| `BlockPresenceIndicator.tsx` | 블록 편집 중인 사용자 아바타 표시 |
| `BlockPresence.css` | 아바타 위치/애니메이션 스타일 |
| `send-notification-email/index.ts` | 7가지 알림 유형 이메일 Edge Function |
| `20260208_create_databases.sql` | Database 테이블 마이그레이션 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `useCloudflareCollaboration.ts` | RemoteCursor에 id, avatar, blockId 추가 |
| `BlockEditor.tsx` | BlockPresenceIndicator 통합 |
| `DatabasePage.tsx` | Supabase CRUD 연동 (loadDatabases, handleCreateDatabase, handleAddRow) |
| `en.json` / `ko.json` | database.* 번역 25개 키 |

### 완료된 Priority 항목
- ✅ Priority 1-7 모든 항목 완료
- ✅ 빌드 성공 (4.46s)
- ✅ 테스트 통과 (1/1)
- ✅ TypeScript 오류 없음

---

## 아키텍처 변경사항

### Database Feature (Notion-style)
```
databases
├── database_properties (컬럼/필드)
├── database_rows (레코드)
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

---

## 잠재적 미완료 항목
1. ImageUploadModal 실사용 연결
2. Owner 팀 이전 기능
3. 이메일 알림 실발송 검증
