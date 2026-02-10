# 아카이브 시스템

> 완료되거나 불필요한 이슈/PRD를 보관하고 관리하세요.

## 개요

아카이브 시스템은 이슈와 PRD 문서를 별도의 보관 공간으로 이동시킵니다. 30일 후 자동 삭제되며, 그 전에 복원할 수 있습니다.

**파일**: `src/features/issues/pages/ArchivePage.tsx`

## 아카이브 동작

### 아카이브하기
- 이슈 목록에서 선택 후 "Archive" 버튼
- 이슈 상세에서 아카이브 액션
- `archived_at` 컬럼에 현재 시각 설정

### 복원하기
- 아카이브 페이지에서 "Restore" 버튼
- `archived_at`을 NULL로 설정

### 자동 삭제
- 30일 경과된 아카이브 항목 자동 삭제
- `cleanup_expired_archives()` RPC 함수

## DB 스키마

```sql
-- issues 테이블
archived_at TIMESTAMPTZ  -- NULL이면 활성, 값이 있으면 아카이브됨

-- prd_documents 테이블
archived_at TIMESTAMPTZ  -- 동일

-- RPC 함수
archive_item(p_item_type text, p_item_id uuid)    -- 아카이브
restore_item(p_item_type text, p_item_id uuid)    -- 복원
get_archived_items(p_team_id uuid)                 -- 아카이브 목록 조회
cleanup_expired_archives()                         -- 30일 경과 삭제
```

## 마이그레이션

`20260208170700_archive_system.sql`:
- `issues`와 `prd_documents`에 `archived_at` 컬럼 추가
- 아카이브 관리 RPC 함수 생성
- 30일 보관 정책 설정

## 라우트

- `/archive` - 아카이브 목록 페이지

---

**관련 문서**
- [이슈 관리](./issues.md)
- [PRD](./prd.md)
