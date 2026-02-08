# 🗃️ Database (Notion-style)

> 유연한 데이터베이스로 팀 데이터를 관리하세요.

## 개요

Database는 Notion 스타일의 유연한 데이터베이스입니다. 테이블, 보드, 캘린더, 리스트 등 다양한 뷰로 데이터를 관리할 수 있습니다.

## 구현 파일

| 파일 | 설명 |
|------|------|
| `DatabasePage.tsx` | 메인 페이지 (658 lines) |
| `20260208_create_databases.sql` | DB 마이그레이션 |

## DB 스키마

```sql
-- 데이터베이스 메타데이터
databases (id, team_id, name, description, icon)

-- 컬럼/필드 정의
database_properties (id, database_id, name, type, options, position)

-- 레코드
database_rows (id, database_id, properties, created_by, updated_by)

-- 뷰 설정
database_views (id, database_id, name, type, filters, sorts, position)
```

## 지원 속성 타입

| 타입 | 설명 |
|------|------|
| `text` | 단순 텍스트 |
| `number` | 숫자 |
| `date` | 날짜 |
| `select` | 단일 선택 |
| `multi_select` | 다중 선택 |
| `person` | 담당자 |
| `checkbox` | 체크박스 |
| `url` | URL 링크 |
| `email` | 이메일 |
| `phone` | 전화번호 |
| `formula` | 계산식 |
| `relation` | 다른 DB 관계 |
| `rollup` | 집계 |

## 지원 뷰

| 뷰 | 설명 |
|----|------|
| 📊 Table | 스프레드시트 형식 |
| 📋 Board | 칸반 보드 |
| 📅 Calendar | 캘린더 뷰 |
| 📝 List | 리스트 뷰 |
| 🎨 Gallery | 갤러리 카드 |
| ⏳ Timeline | 타임라인 |

## API 메서드

```typescript
// Supabase 직접 호출
const { data } = await supabase
  .from('databases')
  .select('*')
  .eq('team_id', currentTeam.id);

// Row 추가
await supabase
  .from('database_rows')
  .insert({ database_id, properties: {} });
```

## RLS 정책

- 팀 멤버만 해당 팀의 DB 접근 가능
- 팀 admin만 DB 삭제 가능

---

**관련 문서**
- [PRD](./prd.md)
- [Issues](./issues.md)
