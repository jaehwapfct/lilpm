# 협업 아키텍처

> Supabase Realtime + Yjs + Cloudflare Workers 기반 실시간 협업

## 개요

LilPM은 3가지 레이어로 실시간 협업을 구현합니다:

1. **Supabase Realtime** - Broadcast + Presence (현재 활성)
2. **Yjs + Cloudflare Workers** - CRDT 기반 동시 편집 (배포 예정)
3. **Liveblocks** - 추가 협업 기능 (선택적)

## 아키텍처

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   브라우저 A     │◄────►│  Supabase        │◄────►│   브라우저 B     │
│                 │      │  Realtime        │      │                 │
│ ┌─────────────┐ │      │  (Broadcast +    │      │ ┌─────────────┐ │
│ │ BlockEditor │ │      │   Presence)      │      │ │ BlockEditor │ │
│ └─────────────┘ │      └──────────────────┘      │ └─────────────┘ │
│ ┌─────────────┐ │                                │ ┌─────────────┐ │
│ │ Collaboration│ │      ┌──────────────────┐      │ │ Collaboration│ │
│ │ Hooks       │ │◄────►│  Cloudflare      │◄────►│ │ Hooks       │ │
│ └─────────────┘ │      │  Workers (Yjs)   │      │ └─────────────┘ │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

## 협업 훅

### useSupabaseCollaboration

**위치**: `src/hooks/collaboration/useSupabaseCollaboration.ts`

Supabase Realtime을 사용한 핵심 협업 훅

```typescript
const {
  isConnected,          // 채널 연결 상태
  presenceUsers,        // 접속 중인 유저 목록
  updateCursorPosition, // 커서 위치 브로드캐스트
  broadcastContentChange, // 컨텐츠 변경 브로드캐스트
  onRemoteContentChange,  // 원격 변경 수신 콜백
} = useSupabaseCollaboration({
  entityType: 'prd',
  entityId: prdId,
  userId, userName, avatarUrl,
  enabled: true,
});
```

**채널 구조:**
```typescript
const roomName = `collab:${entityType}:${entityId}`;
const channel = supabase.channel(roomName, {
  config: { presence: { key: userId } }
});
```

**이벤트:**
- Presence: `sync`, `join`, `leave`
- Broadcast: `content_change`, `cursor_update`

### useCloudflareCollaboration

**위치**: `src/hooks/collaboration/useCloudflareCollaboration.ts`

Yjs + Cloudflare Workers 기반 CRDT 협업

```typescript
const {
  yjsDoc,        // Yjs Document
  isConnected,
  remoteCursors,  // RemoteCursor[]
} = useCloudflareCollaboration({
  roomId: `prd-${prdId}`,
  userId, userName, avatarUrl, userColor,
  enabled: false, // 현재 비활성 (Cloudflare Worker 배포 후 활성화)
});
```

**RemoteCursor 타입:**
```typescript
interface RemoteCursor {
  id: string;
  odId: string;
  name: string;
  color: string;
  avatar?: string;
  position: number;
  blockId?: string;    // 편집 중인 블록 ID
  lastUpdate: number;
}
```

### useRealtimeCollaboration

**위치**: `src/hooks/useRealtimeCollaboration.ts`

사이드바 프레즌스를 위한 글로벌 협업 훅
- 현재 경로 추적
- 온라인 유저 목록

### useTeamRealtime

**위치**: `src/hooks/data/useTeamRealtime.ts`

팀 멤버 변경 실시간 구독

```typescript
useTeamMemberRealtime(teamId);   // team_members 테이블 변경 구독
useUserTeamsRealtime(userId);    // 사용자의 팀 목록 변경 구독
```

## Cloudflare Workers (Yjs 서버)

**위치**: `workers/collab/`

### YjsRoom (Durable Object)

```typescript
// workers/collab/src/YjsRoom.ts
export class YjsRoom {
  // Yjs 문서 상태 관리
  // WebSocket 연결 처리
  // 커서 위치 동기화
}
```

### 설정

```toml
# workers/collab/wrangler.toml
name = "lilpm-collab"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "YJS_ROOM", class_name = "YjsRoom" }
]
```

## 데이터 흐름

### 컨텐츠 편집 (Supabase Realtime)

```
사용자 A 타이핑
     │
     ▼
BlockEditor.onUpdate
     │
     ▼
handleContentChange(value)
     │
     ├──► setContent(value)                 ← React 상태 업데이트
     │
     └──► broadcastContentChange(value)     ← Supabase Broadcast
                    │
                    ▼
          Supabase Realtime Channel
                    │
                    ▼
           사용자 B의 channel.on('broadcast')
                    │
                    ▼
           onRemoteContentChange(content, userId)
                    │
                    ├──► setContent(remoteContent)
                    └──► editor.commands.setContent(content, { emitUpdate: false })
```

> **중요**: `emitUpdate: false`로 원격 업데이트가 다시 브로드캐스트되는 것을 방지

## UI 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `PresenceAvatars` | components/collaboration/ | 접속자 아바타 표시 |
| `CursorPresence` | components/collaboration/ | 원격 커서 위치 표시 |
| `EditingIndicator` | components/collaboration/ | "편집 중" 표시 |
| `OnlineUsersPanel` | components/collaboration/ | 온라인 유저 패널 |
| `BlockPresenceIndicator` | components/editor/ | 블록별 편집자 아바타 |
| `CursorOverlay` | components/editor/ | 에디터 내 원격 커서 오버레이 |

## 제한사항

1. **Yjs 비활성화**: Cloudflare Worker 배포 전까지 Yjs CRDT 협업은 비활성
2. **Last-Writer-Wins**: Yjs 없이는 동시 편집 시 마지막 저장이 우선
3. **커서 정확도**: 원격 업데이트 후 로컬 커서가 약간 어긋날 수 있음

## 향후 계획

1. Cloudflare Worker 배포 → Yjs CRDT 활성화
2. 오프라인 지원 (IndexedDB)
3. 실시간 undo/redo 동기화

---

**관련 문서**
- [실시간 협업 기능](../features/realtime-collaboration.md)
- [프론트엔드 아키텍처](./frontend.md)
