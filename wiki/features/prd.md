# 📝 PRD (제품 요구사항 문서)

> 체계적인 제품 기획 문서를 작성하고 관리하세요.

## 개요

PRD(Product Requirements Document)는 제품 또는 기능의 요구사항을 정의하는 문서입니다. LilPM에서는 풍부한 블록 에디터와 Lily AI의 도움을 받아 체계적인 PRD를 작성할 수 있습니다.

## PRD 상태

| 상태 | 설명 |
|------|------|
| 📝 **Draft** | 작성 중인 문서 |
| 👀 **In Review** | 리뷰 대기 중 |
| ✅ **Approved** | 승인된 문서 |
| 📦 **Archived** | 보관된 문서 |

## 주요 기능

### 1. 블록 에디터 (TipTap)

`src/components/editor/BlockEditor.tsx` 기반의 강력한 편집 기능:

#### 서식
- **제목**: H1, H2, H3
- **텍스트**: 볼드, 이탤릭, 밑줄, 취소선
- **리스트**: 순서 있음/없음, 체크리스트

#### 테이블 편집 (lines 863-955)
| 기능 | 설명 |
|------|------|
| 행/열 추가 | 위/아래/앞/뒤 방향 선택 |
| 행/열 삭제 | 현재 행 또는 열 삭제 |
| 셀 병합 | 여러 셀 선택 후 병합 |
| 셀 분리 | 병합된 셀 분리 |
| 헤더 토글 | 헤더 행 설정/해제 |
| 테이블 삭제 | 전체 테이블 삭제 |

```tsx
// BlockEditor.tsx - Table Dropdown Menu (lines 863-955)
<DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
  + 위에 행 추가
</DropdownMenuItem>
<DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
  + 아래에 행 추가
</DropdownMenuItem>
<DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
  + 앞에 열 추가
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()}>
  셀 병합
</DropdownMenuItem>
<DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()}>
  셀 분리
</DropdownMenuItem>
```

#### 이미지 리사이즈 (lines 111-167)

호버 시 리사이즈 핸들이 표시되며, 선택 없이도 크기 조절 가능:

```tsx
// ResizableImageComponent
<div
  className={cn(
    "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-cyan-500/50",
    selected ? "opacity-100" : "opacity-0 group-hover:opacity-70"
  )}
  onMouseDown={(e) => handleMouseDown(e, 'left')}
/>
```

- **테두리 색상**: `cyan-500` (청록색)
- **표시 시점**: 호버 또는 선택 시
- **하단 너비 입력**: 픽셀 단위 직접 입력 가능

### 2. @멘션 및 알림

PRD 본문에서 `@`를 입력하면 팀 멤버를 멘션할 수 있습니다.

#### 멘션 플로우

```
@입력 → 팀 멤버 자동완성 → 선택 → handleMention 호출
                                    ↓
                         ┌─────────────────────────┐
                         │ 1. notifications 테이블  │
                         │    INSERT (인박스용)      │
                         └────────────┬────────────┘
                                      ↓
                         ┌─────────────────────────┐
                         │ 2. send-mention-email   │
                         │    Edge Function 호출    │
                         └─────────────────────────┘
```

#### 코드 위치 (PRDDetailPage.tsx lines 328-365)

```typescript
const handleMention = useCallback(async (userId: string, userName: string) => {
  if (!user || !prd || userId === user.id) return; // 본인 제외

  // 1. 인박스 알림 저장
  await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: user.id,
    type: 'prd_mentioned',
    title: `${user.name} mentioned you`,
    message: `In PRD: ${prd.title}`,
    entity_type: 'prd',
    entity_id: prd.id,
    data: { prdId: prd.id, mentionedBy: user.id, prdTitle: prd.title },
    read: false,
  });

  // 2. 이메일 발송 (비동기)
  const mentionedUser = teamMembers.find(m => m.id === userId);
  if (mentionedUser?.email) {
    supabase.functions.invoke('send-mention-email', {
      body: {
        recipientEmail: mentionedUser.email,
        mentionerName: user.name,
        prdId: prd.id,
        prdTitle: prd.title,
      },
    });
  }
}, [user, prd, teamMembers]);
```

### 3. 프로젝트 연결 (lines 541-560, 830-860)

PRD를 프로젝트와 연결하여 관리:

```typescript
// PRDDetailPage.tsx
const toggleProjectLink = async (projectId: string) => {
  const isLinked = linkedProjects.some(p => p.id === projectId);
  
  if (isLinked) {
    await prdService.unlinkFromProject(prdId, projectId);
    setLinkedProjects(prev => prev.filter(p => p.id !== projectId));
    toast.success('Project unlinked');
  } else {
    await prdService.linkToProject(prdId, projectId);
    setLinkedProjects(prev => [...prev, project]);
    toast.success('Project linked');
  }
};
```

- **드롭다운 UI**: 프로젝트 목록에서 선택/해제
- **다중 연결**: 하나의 PRD에 여러 프로젝트 연결 가능
- **체크 표시**: 이미 연결된 프로젝트는 체크 아이콘 표시

### 4. 제목 인라인 편집 (lines 996-997)

클릭으로 제목을 바로 편집:

```tsx
// 편집 중
<Input
  className="text-3xl font-bold"
  style={{ fontSize: 'clamp(1.875rem, 5vw, 2.25rem)', lineHeight: 1.2 }}
  value={editedTitle}
  onChange={(e) => setEditedTitle(e.target.value)}
/>

// 표시 모드
<h1
  className="font-bold text-3xl sm:text-4xl lg:text-5xl"
  style={{ fontSize: 'clamp(1.875rem, 5vw, 2.25rem)', lineHeight: 1.2 }}
  onClick={() => setIsEditingTitle(true)}
>
  {prd.title}
</h1>
```

- **반응형 폰트**: `clamp(1.875rem, 5vw, 2.25rem)` 사용
- **편집/표시 폰트 일치**: 동일한 스타일 유지

### 5. 실시간 저장

모든 변경사항이 자동으로 저장됩니다:

```typescript
const { debouncedSave } = useAutoSave({
  onSave: async (value) => {
    await prdService.updatePRD(prdId, { content: value });
    setLastSaved(new Date());
  },
  delay: 2000, // 2초 디바운스
});
```

저장 상태 표시:
- ☁️ 모든 변경사항 저장됨
- 🔄 저장 중...
- ⚠️ 미저장 변경사항

### 6. AI 어시스턴트

PRD 편집 중 AI 패널을 열어 도움을 받을 수 있습니다.

## Edge Functions

| 함수명 | 용도 |
|--------|------|
| `send-mention-email` | @멘션 이메일 알림 발송 |

## API 참조

```typescript
// src/lib/services/prdService.ts

getPRDs(teamId: string): Promise<PRD[]>
getPRD(prdId: string): Promise<PRDWithRelations>
createPRD(teamId: string, prd: CreatePRDInput): Promise<PRD>
updatePRD(prdId: string, updates: Partial<PRD>): Promise<PRD>
updateStatus(prdId: string, status: PRDStatus): Promise<void>
linkToProject(prdId: string, projectId: string): Promise<void>
unlinkFromProject(prdId: string, projectId: string): Promise<void>
```

---

**관련 문서**
- [Lily AI](./lily-ai.md)
- [이슈 관리](./issues.md)
