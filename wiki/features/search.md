# 글로벌 검색

> 이슈, PRD, 프로젝트, 멤버를 빠르게 검색하세요.

## 개요

글로벌 검색은 팀 내 모든 엔티티를 통합 검색합니다.

**파일**: `src/components/search/GlobalSearch.tsx`

## 검색 대상

| 엔티티 | 검색 필드 |
|--------|----------|
| Issues | title, identifier, description |
| PRDs | title, overview |
| Projects | name, description |
| Members | name, email |

## 사용 방법

- **키보드 단축키**: `Cmd/Ctrl + /` 또는 `Cmd/Ctrl + K`
- **검색 바**: 헤더의 검색 입력
- **Command 팔레트**: shadcn/ui Command 컴포넌트 기반

## 구현

```tsx
// GlobalSearch.tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandGroup heading="Issues">
      {filteredIssues.map(issue => (
        <CommandItem onSelect={() => navigate(`/issue/${issue.id}`)}>
          {issue.identifier} {issue.title}
        </CommandItem>
      ))}
    </CommandGroup>
    <CommandGroup heading="PRDs">...</CommandGroup>
    <CommandGroup heading="Projects">...</CommandGroup>
  </CommandList>
</CommandDialog>
```

---

**관련 문서**
- [이슈 관리](./issues.md)
- [프론트엔드 아키텍처](../architecture/frontend.md)
