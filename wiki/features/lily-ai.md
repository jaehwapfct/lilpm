# 🤖 Lily AI

> AI 어시스턴트와 대화하며 PRD와 티켓을 자동 생성하세요.

## 개요

Lily는 LilPM에 내장된 AI 어시스턴트입니다. 프로젝트 기획, PRD 작성, 개발 티켓 생성을 대화형 인터페이스로 지원합니다.

## 지원 AI 모델

| 모델 | 제공자 | 특징 |
|------|--------|------|
| 🟣 **Claude Sonnet** | Anthropic | 코드 분석, 복잡한 추론에 강점 |
| 🟢 **GPT-4o** | OpenAI | 범용 AI, 빠른 응답 |
| 🔵 **Gemini Pro** | Google | 멀티모달, 긴 컨텍스트 |

## 주요 기능

### 1. 대화형 기획

```
사용자: 사용자 인증 기능을 구현하고 싶어
Lily: 인증 기능에 대해 자세히 알려주세요. 
      - 소셜 로그인이 필요한가요?
      - 이메일 인증이 필요한가요?
      - 2FA를 지원할 건가요?
```

### 2. PRD 자동 생성

1. 대화를 통해 요구사항 정리
2. "PRD 생성하기" 버튼 클릭
3. AI가 구조화된 PRD 문서 생성
4. PRD 페이지에서 편집 및 저장

### 3. 티켓 자동 생성

```
Lily: 다음 티켓들을 제안드립니다:

[제안된 이슈]
1. 🎫 이메일 인증 API 구현
   우선순위: 높음
   [수락] [거절]

2. 🎫 로그인 페이지 UI 구현
   우선순위: 중간
   [수락] [거절]

[모두 수락]
```

### 4. Canvas 모드

실시간 코드 생성 및 미리보기:

```
┌─────────────────────┬─────────────────────┐
│      대화창          │     Canvas          │
├─────────────────────┼─────────────────────┤
│ 사용자: 로그인 폼    │ [코드] [미리보기]    │
│        만들어줘     │                     │
│                     │   ┌─────────────┐   │
│ Lily: 만들고        │   │ Login Form  │   │
│       있습니다...   │   │ ───────────│   │
│                     │   │ Email: ___  │   │
│                     │   │ Pass: ___   │   │
│                     │   │ [Login]     │   │
│                     │   └─────────────┘   │
└─────────────────────┴─────────────────────┘
```

## 대화 관리

### 대화 저장 및 목록

대화는 자동 저장되며 사이드바에서 관리합니다:

```tsx
// LilyChat.tsx 사이드바 구조
┌─────────────────────────┐
│ ➕ New Chat              │
├─────────────────────────┤
│ 📌 Pinned               │
│   📌 중요 대화 1         │
│   📌 중요 대화 2         │
├─────────────────────────┤
│ 🕐 Recent               │
│   💬 오늘의 대화         │
│   💬 어제 대화           │
└─────────────────────────┘
```

### 드래그 앤 드롭 재정렬

`@dnd-kit` 라이브러리를 사용한 대화 순서 재정렬:

```tsx
// LilyChat.tsx (SortableContext 사용)
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

// 드래그 핸들 아이콘
<GripVertical className="h-3 w-3 text-muted-foreground" />
```

**지원 기능:**
- 📌 고정 대화 핀/언핀
- ✏️ 대화 이름 변경
- 🗑️ 대화 삭제
- 🔀 드래그로 순서 변경

### 대화 공유

대화를 외부 사용자와 공유할 수 있습니다:

```
┌─────────────────────────────────────────┐
│  Share Conversation                      │
├─────────────────────────────────────────┤
│  🔗 Share Link:                          │
│  [https://app.com/lily/shared/abc123]   │
│                                          │
│  ⚙️ Settings:                            │
│  ☑ Allow comments                        │
│  ☑ Require authentication               │
│                                          │
│  [Copy Link] [Remove Share]              │
└─────────────────────────────────────────┘
```

#### 공유 관련 테이블

```sql
-- conversation_shares 테이블
CREATE TABLE conversation_shares (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id),
  share_token TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- conversation_access_requests 테이블  
CREATE TABLE conversation_access_requests (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 에디터 기능 (BlockEditor)

### TipTap 기반 Rich Text Editor

```tsx
// BlockEditor.tsx에서 사용하는 주요 확장
const extensions = [
  StarterKit,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  CustomTableCell,  // 배경색, 너비 지원
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem,
  Link,
  ResizableImage,
  CodeBlockLowlight,
  // Notion-style blocks
  CalloutNode,
  ToggleNode,
  VideoNode,
  EquationNode,
];
```

### 테이블 고급 기능

| 기능 | 설명 |
|------|------|
| 행/열 추가/삭제 | Add Row Above/Below, Add Column Left/Right |
| 셀 병합/분리 | Merge Cells, Split Cell |
| 헤더 토글 | Toggle Header Row/Column |
| **셀 배경색** | 8가지 프리셋 색상 (Red, Orange, Yellow, Green, Blue, Purple, Pink, Gray) |
| **셀 너비 조절** | 드래그로 컬럼 너비 조절 |

#### CustomTableCell 확장

```typescript
// BlockEditor.tsx
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      colwidth: {
        default: null,
        parseHTML: element => {
          const colwidth = element.getAttribute('colwidth');
          return colwidth ? colwidth.split(',').map(w => parseInt(w, 10)) : null;
        },
        renderHTML: attributes => {
          if (!attributes.colwidth) return {};
          return { colwidth: attributes.colwidth.join(',') };
        },
      },
    };
  },
});
```

#### 셀 배경색 메뉴

```tsx
// 테이블 드롭다운 메뉴에서 색상 선택
<DropdownMenu>
  <DropdownMenuTrigger>
    <Paintbrush /> Cell Background
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {[
      { name: 'Red', color: '#FEE2E2' },
      { name: 'Orange', color: '#FFEDD5' },
      { name: 'Yellow', color: '#FEF3C7' },
      { name: 'Green', color: '#DCFCE7' },
      { name: 'Blue', color: '#DBEAFE' },
      { name: 'Purple', color: '#F3E8FF' },
      { name: 'Pink', color: '#FCE7F3' },
      { name: 'Gray', color: '#F3F4F6' },
    ].map(({ name, color }) => (
      <DropdownMenuItem
        onClick={() => editor.chain().focus()
          .setCellAttribute('backgroundColor', color).run()}
      >
        <div style={{ backgroundColor: color }} /> {name}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

## API 키 설정

### 설정 방법

1. **설정 페이지**: `/settings/ai` 에서 설정
2. **모달 입력**: Lily 최초 사용 시 모달에서 입력

### 저장 위치

API 키는 Supabase `user_ai_settings` 테이블에 저장됩니다:

```sql
user_ai_settings (
  user_id UUID,
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  default_provider TEXT,
  auto_mode_enabled BOOLEAN
)
```

## 기술 구현

### 스트리밍 응답

Server-Sent Events (SSE)를 통한 실시간 스트리밍:

```typescript
// LilyChat.tsx
const response = await fetch('/functions/v1/lily-chat', {
  method: 'POST',
  body: JSON.stringify({ messages, provider, stream: true }),
});

const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // 스트리밍 데이터 처리
}
```

### Thinking 블록

Claude의 사고 과정 표시:

```typescript
// <thinking> 태그 파싱
const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
if (thinkingMatch) {
  thinkingContent = thinkingMatch[1];
  cleanContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}
```

### 추천 이슈

```typescript
// SuggestedIssuesList 컴포넌트
interface SuggestedIssue {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

// 수락 시 실제 이슈로 생성
onAcceptIssue={(index, issue) => {
  await createIssue(teamId, issue);
  acceptSuggestedIssue(index);
}}
```

## 데이터베이스 스키마

### conversations 테이블

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  is_pinned BOOLEAN DEFAULT false,
  sort_order FLOAT,  -- 드래그 재정렬용
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### messages 테이블

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  thinking_content TEXT,  -- Claude thinking 블록
  suggested_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 프롬프트 엔지니어링

### 시스템 프롬프트 구조

```
당신은 Lily, LilPM의 AI 제품 기획 어시스턴트입니다.

역할:
- 프로젝트 요구사항 분석
- PRD 문서 작성 지원
- 개발 티켓 생성 제안

응답 규칙:
1. 한국어로 응답 (사용자 언어에 맞춤)
2. 구조화된 형식 사용
3. 실행 가능한 티켓 제안

컨텍스트:
- 현재 프로젝트: {projectName}
- 팀: {teamName}
- 기존 이슈 수: {issueCount}
```

## MCP 통합 (Model Context Protocol)

Lily는 MCP 도구를 통해 외부 서비스와 연동할 수 있습니다:

```typescript
// lily-chat Edge Function에서 MCP 도구 호출
// mcpTools 파라미터로 사용 가능한 도구 전달
const response = await fetch('/functions/v1/lily-chat', {
  body: JSON.stringify({
    messages,
    mcpTools: [{ name: 'search_web', endpoint: '...', apiKey: '...' }],
  }),
});
```

자세한 내용: [MCP 통합](./mcp.md)

## 멀티모달 지원

이미지와 파일을 첨부하여 AI와 대화:

```typescript
// 이미지 데이터 전송
const response = await fetch('/functions/v1/lily-chat', {
  body: JSON.stringify({
    messages,
    imageData: { base64: '...', mimeType: 'image/png' },
  }),
});
```

## Lovable Gateway 폴백

사용자 API 키가 없거나 오류 발생 시 Lovable Gateway를 폴백으로 사용합니다.

---

**관련 문서**
- [PRD](./prd.md)
- [이슈 관리](./issues.md)
- [MCP 통합](./mcp.md)
- [블록 에디터](./block-editor.md)
- [API 설계](../architecture/api.md)
- [데이터베이스 스키마](../architecture/database.md)

