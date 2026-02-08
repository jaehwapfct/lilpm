---
name: AI Integration
description: AI API 호출, 프롬프트 최적화, 스트리밍 응답 처리 가이드
---

# AI Integration Skill

## 개요
Lily AI를 포함한 모든 AI 기능 개발을 위한 가이드입니다.

## 지원 모델
| 모델 | Provider | 용도 |
|------|----------|------|
| Claude 3.5 Sonnet | Anthropic | 기본 PRD/티켓 생성 |
| GPT-4o | OpenAI | 대체 모델 |
| Gemini Pro | Google | 대체 모델 |

## API 호출 패턴

### Edge Function 기본 구조
```typescript
// supabase/functions/lily-chat/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk';

export async function handleChat(req: Request) {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  });
  
  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
  });
  
  // 스트리밍 응답
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 프론트엔드 스트림 처리
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/lily-chat`, {
  method: 'POST',
  body: JSON.stringify({ messages }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  setContent(prev => prev + chunk);
}
```

## 프롬프트 템플릿

### PRD 생성 프롬프트
```typescript
const PRD_PROMPT = `
You are a product manager assistant. Create a structured PRD based on:
- Title: {title}
- User request: {userRequest}

Include:
1. Overview
2. User Stories
3. Requirements
4. Success Metrics
`;
```

### 이슈 생성 프롬프트
```typescript
const ISSUE_PROMPT = `
Convert this PRD section into development tickets:
{prdSection}

For each ticket include:
- Title (concise)
- Description (technical details)
- Acceptance criteria
- Priority estimate
`;
```

## 에러 핸들링

```typescript
try {
  const response = await anthropic.messages.create({...});
} catch (error) {
  if (error.status === 429) {
    // Rate limit - 재시도
    await delay(1000);
    return retry();
  }
  if (error.status === 500) {
    // Provider 에러 - 대체 모델로 폴백
    return fallbackToGPT();
  }
  throw error;
}
```

## 토큰 관리

```typescript
// 예상 토큰 계산 (대략적)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// 컨텍스트 윈도우 관리
const MAX_CONTEXT = 100000; // Claude 3.5

function trimContext(messages: Message[]): Message[] {
  let totalTokens = 0;
  return messages.filter(msg => {
    totalTokens += estimateTokens(msg.content);
    return totalTokens < MAX_CONTEXT * 0.8;
  });
}
```

## 베스트 프랙티스

1. **API 키 보안**: Edge Function 환경변수에만 저장
2. **스트리밍 우선**: 긴 응답은 항상 스트리밍
3. **폴백 전략**: 하나의 Provider 실패 시 대체 모델
4. **토큰 추적**: 사용량 로깅으로 비용 관리
5. **캐싱**: 동일 요청 결과 캐시 (optional)

## 체크리스트
- [ ] Edge Function에 API 키 설정
- [ ] 스트리밍 응답 UI 구현
- [ ] 에러 토스트 표시
- [ ] 로딩 인디케이터
- [ ] 재시도 로직
