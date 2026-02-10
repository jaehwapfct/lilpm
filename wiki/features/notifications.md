# 🔔 Notifications

> 인앱, 이메일 알림으로 팀과 소통하세요.

## 개요

Notifications는 10가지 이상의 알림 유형을 지원하며, 인앱 Inbox와 이메일로 전달됩니다.

## 구현 파일

| 파일 | 설명 |
|------|------|
| `InboxPage.tsx` | Inbox UI (630 lines) |
| `send-notification-email/` | Edge Function |
| `send-mention-email/` | @멘션 전용 |

## 알림 유형

| 유형 | 설명 | 이메일 |
|------|------|:------:|
| `issue_assigned` | 이슈 할당됨 | ✅ |
| `issue_mentioned` | 이슈에서 멘션 | ✅ |
| `comment_added` | 새 댓글 | ✅ |
| `due_date_reminder` | 마감일 알림 | ✅ |
| `status_changed` | 상태 변경 | ✅ |
| `team_invite` | 팀 초대 | ✅ |
| `prd_mentioned` | PRD 멘션 | ✅ |

## DB 스키마

```sql
notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  actor_id uuid REFERENCES profiles(id),
  type notification_type,
  title text,
  message text,
  entity_type text,
  entity_id uuid,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz
)
```

## Edge Function API

```typescript
// send-notification-email 호출
await supabase.functions.invoke('send-notification-email', {
  body: {
    recipientId: 'user-uuid',
    recipientEmail: 'user@example.com',
    recipientName: 'John',
    type: 'issue_assigned',
    data: {
      actorName: 'Jane',
      entityTitle: 'Fix login bug',
      entityId: 'issue-uuid',
      entityType: 'issue',
      message: 'Jane assigned you to this issue.',
    }
  }
});
```

## Toast (sonner)

```typescript
import { toast } from 'sonner';

// 성공
toast.success('Issue created');

// 에러
toast.error('Failed to save');

// 로딩
toast.loading('Saving...');
```

## Inbox UI

| 기능 | 설명 |
|------|------|
| 읽음/안읽음 | 필터 탭 |
| 클릭 시 이동 | entity_type/entity_id로 라우팅 |
| 전체 읽음 | Mark all as read 버튼 |

## 알림 설정

**파일**: `src/pages/settings/NotificationSettingsPage.tsx`

유형별 알림 활성화/비활성화:
- 이메일 알림 on/off
- 인앱 알림 on/off
- `notificationSettingsStore`로 관리

## 알림 실시간 구독

```typescript
// Supabase Realtime으로 알림 실시간 수신
supabase.channel(`notifications:${userId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'notifications',
    filter: `user_id=eq.${userId}` }, (payload) => {
    addNotification(payload.new);
    toast(payload.new.title);
  }).subscribe();
```

---

**관련 문서**
- [Issues](./issues.md)
- [PRD](./prd.md)
- [설정](./settings.md)
