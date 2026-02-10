# Database (Notion-style)

> 유연한 데이터베이스로 팀 데이터를 관리하세요.

## 개요

Database는 Notion 스타일의 유연한 데이터베이스입니다. 7가지 이상의 뷰로 데이터를 관리하며, 수식, 관계, 롤업 등 고급 기능을 지원합니다.

**메인 파일**: `src/pages/DatabasePage.tsx`
**컴포넌트 디렉토리**: `src/pages/hooks/` (Database 관련 20+ 파일)

## DB 스키마

```sql
databases (id, team_id, name, description, icon, created_by)
database_properties (id, database_id, name, type, options, position, is_primary,
                     rollup_relation_property_id, rollup_target_property_id, rollup_function)
database_rows (id, database_id, properties, parent_id, position, created_by, updated_by)
database_views (id, database_id, name, type, config, filters, sorts, position)
```

## 지원 속성 타입 (13가지)

| 타입 | 설명 | 컴포넌트 |
|------|------|----------|
| `text` | 단순 텍스트 | EditableCell |
| `number` | 숫자 | EditableCell |
| `date` | 날짜 | EditableCell (DatePicker) |
| `select` | 단일 선택 | EditableCell (Select) |
| `multi_select` | 다중 선택 | EditableCell (MultiSelect) |
| `person` | 담당자 | `DatabasePersonCell.tsx` |
| `checkbox` | 체크박스 | EditableCell (Checkbox) |
| `url` | URL 링크 | EditableCell |
| `email` | 이메일 | EditableCell |
| `phone` | 전화번호 | EditableCell |
| `formula` | 계산식 | `DatabaseFormulaEngine.ts` |
| `relation` | 다른 DB 관계 | `DatabaseRelationCell.tsx` |
| `rollup` | 집계 (count, sum, avg, min, max) | `DatabaseRollupCell.tsx` |

## 지원 뷰 (7가지+)

| 뷰 | 파일 | 설명 |
|----|------|------|
| Table | `DatabasePage.tsx` | 스프레드시트 형식 (기본) |
| Board | `DatabasePage.tsx` | 칸반 보드 |
| Calendar | `DatabaseCalendarView.tsx` | 캘린더 뷰 |
| Gallery | `DatabaseGalleryView.tsx` | 갤러리 카드 뷰 |
| Timeline | `DatabaseTimelineView.tsx` | 타임라인 뷰 |
| Chart | `DatabaseChartView.tsx` | 차트 시각화 |
| Form | `DatabaseFormView.tsx` | 폼 입력 뷰 |

## 주요 컴포넌트

| 파일 | 설명 |
|------|------|
| `DatabaseViewManager.tsx` | 뷰 전환 및 관리 |
| `DatabaseFilterBuilder.tsx` | 필터 조건 빌더 UI |
| `DatabaseSortBuilder.tsx` | 정렬 조건 빌더 UI |
| `DatabaseGroupBy.tsx` | 그룹화 설정 |
| `DatabaseConditionalFormat.tsx` | 조건부 서식 |
| `DatabaseCSVHandler.tsx` | CSV 가져오기/내보내기 |
| `DatabaseDragDrop.tsx` | 행 드래그앤드롭 |
| `DatabaseRowSidePeek.tsx` | 행 상세 사이드 패널 |
| `DatabaseSummaryRow.tsx` | 요약 행 (합계, 평균 등) |
| `DatabaseSubItems.tsx` | 서브 아이템 (parent_id 기반) |
| `DatabasePropertyToggle.tsx` | 속성 표시/숨김 토글 |
| `EditableCell.tsx` | 셀 인라인 편집 |
| `databaseTypes.ts` | 타입 정의 |
| `useDatabaseHandlers.ts` | 데이터 핸들러 훅 |

## 수식 엔진

**파일**: `src/pages/hooks/DatabaseFormulaEngine.ts`

```typescript
// 지원 함수
IF(condition, trueValue, falseValue)
SUM(field), AVG(field), MIN(field), MAX(field), COUNT(field)
CONCAT(str1, str2, ...), UPPER(str), LOWER(str)
NOW(), TODAY(), DATEADD(date, days)
// 산술: +, -, *, /
// 비교: =, !=, >, <, >=, <=
```

## Sub-items (2026-02-10)

`database_rows`에 `parent_id`와 `position` 컬럼 추가로 계층 구조 지원:

```sql
parent_id UUID REFERENCES database_rows(id) ON DELETE CASCADE
position INTEGER DEFAULT 0
```

## 테스트

**디렉토리**: `src/pages/hooks/__tests__/`

| 테스트 | 설명 |
|--------|------|
| `DatabaseCSV.test.ts` | CSV 가져오기/내보내기 |
| `DatabaseE2E.test.ts` | E2E 통합 테스트 |
| `DatabaseFilterBuilder.test.ts` | 필터 빌더 |
| `DatabaseFormulaEngine.test.ts` | 수식 엔진 |
| `DatabaseSort.test.ts` | 정렬 기능 |

## 이슈 연동 (IssuesDatabaseAdapter)

**파일**: `src/features/issues/adapters/IssuesDatabaseAdapter.ts`

이슈 데이터를 Database 뷰 형식으로 변환하여 Calendar, Timeline, Gallery, Chart 뷰에서 이슈를 표시할 수 있습니다.

## RLS 정책

- 팀 멤버만 해당 팀의 DB 접근 가능
- 팀 admin만 DB 삭제 가능
- 모든 database_* 테이블에 RLS 적용

## API

```typescript
// Supabase 직접 호출
const { data } = await supabase
  .from('databases').select('*').eq('team_id', teamId);

// Row CRUD
await supabase.from('database_rows').insert({ database_id, properties: {} });
await supabase.from('database_rows').update({ properties }).eq('id', rowId);
await supabase.from('database_rows').delete().eq('id', rowId);
```

---

**관련 문서**
- [블록 에디터](./block-editor.md)
- [이슈 관리](./issues.md)
- [데이터베이스 스키마](../architecture/database.md)
