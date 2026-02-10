# MCP 통합 (Model Context Protocol)

> 외부 MCP 서버를 연결하여 AI 기능을 확장하세요.

## 개요

MCP(Model Context Protocol)는 AI 모델에 외부 도구를 연결하는 프로토콜입니다. LilPM은 `mcp-proxy` Edge Function을 통해 MCP 서버와 통신합니다.

## 아키텍처

```
Lily Chat → lily-chat Edge Function → MCP Tools
                                          ↓
                               mcp-proxy Edge Function
                                          ↓
                               External MCP Servers
```

## Edge Function: mcp-proxy

**파일**: `supabase/functions/mcp-proxy/index.ts`

```typescript
POST /functions/v1/mcp-proxy
Body: {
  endpoint: string,  // MCP 서버 URL
  apiKey: string,    // 인증 키
  action: string,    // "call_tool", "list_tools" 등
  params?: object    // 도구 파라미터
}
```

**특징:**
- 여러 엔드포인트 패턴 자동 시도
- Bearer 토큰 인증 지원
- 다양한 MCP 호출 형식 처리

## 프론트엔드

### mcpStore

**파일**: `src/stores/mcpStore.ts`

MCP 서버 연결 설정 관리

### MCPSettingsPage

**파일**: `src/pages/settings/MCPSettingsPage.tsx`

MCP 서버 추가/제거/테스트 UI

### mcpUtils

**파일**: `src/features/lily/utils/mcpUtils.ts`

MCP 도구 호출 유틸리티

## 타입

```typescript
// types/mcp.ts
interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
}

interface MCPTool {
  name: string;
  description: string;
  parameters: object;
}
```

---

**관련 문서**
- [Lily AI](./lily-ai.md)
- [설정](./settings.md)
- [API 설계](../architecture/api.md)
