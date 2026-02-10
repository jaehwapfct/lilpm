# 블록 에디터 (TipTap)

> 강력한 Rich Text 에디터로 문서를 작성하세요.

## 개요

LilPM의 블록 에디터는 TipTap 3.19 기반으로 Notion 스타일의 편집 경험을 제공합니다. PRD 편집, 이슈 설명, Lily AI Canvas 등에서 사용됩니다.

**핵심 파일**: `src/components/editor/BlockEditor.tsx`

## 지원 블록 타입

### 기본 서식
- **제목**: H1, H2, H3
- **텍스트**: 볼드, 이탤릭, 밑줄, 취소선, 인라인 코드
- **하이라이트**: 멀티컬러 하이라이팅
- **리스트**: 순서 있음/없음, 체크리스트 (TaskList/TaskItem)
- **인용문**: Blockquote
- **구분선**: Horizontal Rule

### 테이블
| 기능 | 설명 |
|------|------|
| 행/열 추가/삭제 | 위/아래/앞/뒤 방향 선택 |
| 셀 병합/분리 | 여러 셀 선택 후 병합 |
| 헤더 토글 | 헤더 행/열 설정 |
| **셀 배경색** | 8가지 프리셋 (Red, Orange, Yellow, Green, Blue, Purple, Pink, Gray) |
| **셀 너비 조절** | 드래그로 컬럼 너비 조절 |

### 미디어
- **이미지**: 리사이즈 핸들 (좌/우 드래그), 하단 너비 입력 (px)
- **비디오**: VideoNode 확장
- **코드 블록**: 언어별 신택스 하이라이팅 (CodeBlockLowlight)

### Notion 스타일 블록
- **Callout**: 아이콘 + 배경색 박스
- **Toggle**: 접기/펼치기 리스트
- **Equation**: LaTeX 수식 (KaTeX)
- **Database Embed**: 데이터베이스 임베드

### 인터랙티브
- **슬래시 커맨드** (`/`): 블록 타입 빠른 삽입
- **드래그 핸들**: 블록 순서 변경
- **페이지 링크**: PageLink 확장
- **멘션**: @멘션으로 팀 멤버 알림

### 협업
- **블록 댓글**: 블록 레벨 인라인 댓글
- **커서 오버레이**: 원격 사용자 커서 표시
- **블록 프레즌스**: 편집 중인 블록에 아바타 표시
- **변경 추적**: TrackChanges 확장

## 확장 목록

```
extensions/
├── blocks/
│   ├── CalloutNode.ts          # 콜아웃 블록
│   └── EquationNode.ts         # 수식 블록
├── database/                    # 데이터베이스 임베드
├── interactive/                 # 인터랙티브 블록
├── layout/                      # 레이아웃 블록
├── media/                       # 미디어 블록
├── BlockComment.ts             # 블록 댓글
├── ClipboardHandler.ts         # 클립보드 처리
├── CodeBlockWithLanguage.tsx    # 코드 블록 + 언어 선택
├── DragHandleMenu.tsx          # 드래그 핸들 메뉴
├── KeyboardShortcuts.ts        # 키보드 단축키
├── PageLink.tsx                # 페이지 링크
├── SlashCommands.tsx           # 슬래시 커맨드 메뉴
├── SyncedBlock.ts              # 동기화 블록
├── SyncedBlockNode.tsx
├── TrackChanges.ts             # 변경 추적
└── UniqueId.ts                 # 블록 고유 ID
```

## CustomTableCell

테이블 셀에 배경색과 너비를 지원하는 커스텀 확장:

```typescript
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      backgroundColor: { default: null },
      colwidth: { default: null },
    };
  },
});
```

## 이미지 리사이즈 (ResizableImage)

**파일**: `src/components/editor/ResizableImage.tsx`

- 호버 시 좌/우 리사이즈 핸들 표시
- 선택 시 항상 표시
- 하단에 너비(px) 직접 입력 가능
- 테두리 색상: `cyan-500`

## 슬래시 커맨드

`/` 입력 시 블록 타입 빠른 삽입 메뉴:

```
/ + 검색어
├── Text
├── Heading 1/2/3
├── Bullet List / Numbered List / Checklist
├── Table
├── Code Block
├── Image
├── Callout
├── Toggle
├── Equation
├── Divider
└── Quote
```

## 버전 히스토리

**파일**: `src/components/editor/VersionHistoryPanel.tsx`

- PRD/이슈의 편집 버전 목록
- 특정 버전으로 복원
- 변경사항 diff 표시

## 블록 댓글

**파일**: `src/components/editor/CommentPanel.tsx`

- 텍스트 선택 후 댓글 추가
- 댓글 스레드 (답글)
- 해결/미해결 토글
- 이모지 리액션 (2026-02-10 추가)

---

**관련 문서**
- [PRD](./prd.md)
- [Lily AI](./lily-ai.md)
- [실시간 협업](./realtime-collaboration.md)
