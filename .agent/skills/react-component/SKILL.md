---
name: React Component Development
description: TipTap, shadcn/ui, Zustand 기반 컴포넌트 개발
triggers:
  - 새 컴포넌트 생성 요청
  - UI 수정/개선
  - 에디터 기능 추가
---

# React 컴포넌트 스킬

## 📁 프로젝트 구조

```
src/
├── components/        # 재사용 컴포넌트
│   ├── ui/           # shadcn/ui 기본 컴포넌트
│   ├── issues/       # 이슈 관련
│   ├── lily/         # Lily AI 관련
│   └── editor/       # TipTap 에디터
├── pages/            # 페이지 컴포넌트
├── hooks/            # 커스텀 훅
├── stores/           # Zustand 스토어
└── lib/
    └── services/     # API 서비스
```

## 🎨 필수 패턴

### shadcn/ui 컴포넌트 사용
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
```

### Zustand 상태관리
```tsx
// stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  items: Item[];
  loadItems: () => Promise<void>;
}

export const useExampleStore = create<ExampleState>((set) => ({
  items: [],
  loadItems: async () => {
    const data = await fetchItems();
    set({ items: data });
  },
}));
```

### react-i18next 번역
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <p>{t('feature.myKey', 'Default text')}</p>;
}
```

### lucide-react 아이콘
```tsx
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

<Loader2 className="h-4 w-4 animate-spin" />
```

## ✏️ TipTap 에디터 확장

### 커스텀 확장 생성
```typescript
// BlockEditor.tsx
const CustomExtension = Extension.create({
  name: 'customExtension',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      customAttr: {
        default: null,
        parseHTML: element => element.getAttribute('data-custom'),
        renderHTML: attributes => {
          if (!attributes.customAttr) return {};
          return { 'data-custom': attributes.customAttr };
        },
      },
    };
  },
});
```

### 셀 속성 변경 (테이블)
```typescript
editor.chain().focus()
  .setCellAttribute('backgroundColor', '#FEE2E2')
  .run();
```

## 📋 컴포넌트 체크리스트

- [ ] TypeScript 타입 정의
- [ ] i18n 키 사용 (하드코딩 텍스트 없음)
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리
- [ ] 반응형 디자인 (모바일 고려)
- [ ] 접근성 (aria-labels, 키보드 네비게이션)

## 🧪 테스트 가이드

```typescript
// 기본 렌더링 테스트
it('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});

// 이벤트 테스트
it('handles click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```
