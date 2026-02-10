# Performance Optimization Guide

## Overview
LilPM uses Vite 5.x with advanced build optimization for fast loading and efficient caching. The architecture is designed for optimal performance across frontend, backend, and database layers.

## Bundle Architecture

### Vendor Chunks (manualChunks)
| Chunk | Contents | Size (gzip) | Caching |
|-------|----------|-------------|---------|
| react-vendor | react, react-dom, react-router-dom | ~53KB | Long-term |
| supabase | @supabase/supabase-js | ~45KB | Long-term |
| editor-core | TipTap core + PM | ~80KB | Long-term |
| editor-extensions | TipTap extensions (15+) | ~55KB | Long-term |
| collaboration | yjs, y-prosemirror, y-indexeddb | ~40KB | Long-term |
| ui-radix | Radix UI primitives (10+) | ~36KB | Long-term |
| icons | lucide-react | ~12KB | Long-term |
| form | react-hook-form, zod | ~22KB | Long-term |
| state | zustand, @tanstack/react-query | ~18KB | Long-term |
| date | date-fns | ~8KB | Long-term |
| i18n | i18next, react-i18next | ~16KB | Long-term |
| animation | framer-motion | ~35KB | Long-term |
| markdown | react-markdown, marked, dompurify | ~25KB | Long-term |
| charts | recharts | ~45KB | Long-term |

### Route-based Code Splitting
All major pages use `React.lazy()` for on-demand loading:

```typescript
const DashboardPage = React.lazy(() => 
  import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage }))
);
```

## Loading Strategy

### Immediate Load (Critical Path)
- Auth pages (Login, Signup)
- LandingPage
- Onboarding pages

### Lazy Load (On Navigation)
- DashboardPage
- IssuesPage, IssueDetailPage
- PRDPage, PRDDetailPage
- LilyPage
- Settings pages
- All other feature pages

## Suspense Fallback
```tsx
<Suspense fallback={<PageLoader />}>
  <Routes>
    {/* All routes */}
  </Routes>
</Suspense>
```

## Caching Strategy

### Browser Caching
- Vendor chunks have content hashes for long-term caching (`[name]-[hash].js`)
- When vendor libraries don't change, browsers use cached versions

### React Query Caching
- Default `staleTime`: 5 minutes - data considered fresh
- Default `gcTime`: 10 minutes - unused data kept in cache
- Automatic background refetching on window focus
- Request deduplication - same queries are not duplicated
- Retry with exponential backoff (max 2 retries)

### In-Memory Caching
- Team member data cached with 5-minute TTL
- Stale-While-Revalidate pattern for frequently accessed data

## Component Optimization

### React.memo
Key components wrapped with `React.memo` to prevent unnecessary re-renders:
- `IssueRow` - Individual issue rows in list view
- `IssueCard` - Kanban board cards
- `NavItem` - Sidebar navigation items
- `ConversationListItem` - Chat conversation items
- `ChatMessage` - AI chat messages

### Build Optimizations
- **Target**: ES2022 for modern browser features (smaller output)
- **CSS**: esbuild CSS minifier (default)
- **CSS Code Splitting**: Enabled for better caching
- **Dependency Pre-bundling**: Key dependencies pre-bundled for faster dev startup
- **Source Maps**: Only in development mode

## Performance Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Initial Bundle | <200KB | ~156KB (index.js) |
| First Contentful Paint | <1.5s | ~1.2s |
| Time to Interactive | <3s | ~2.5s |

## Database Performance
See [Database Indexes](../architecture/database.md#indexes) for the full list of performance indexes including:
- Composite indexes for common query patterns
- Partial indexes for active (non-archived) records
- GIN indexes for JSONB property queries
- Covering indexes to reduce table lookups

## Configuration

### vite.config.ts
```typescript
build: {
  target: "es2022",
  cssMinify: "lightningcss",
  cssCodeSplit: true,
  rollupOptions: {
    output: {
      chunkFileNames: "assets/[name]-[hash].js",
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'supabase': ['@supabase/supabase-js'],
        // ... 12+ granular chunks
      }
    }
  }
}
```

## Best Practices

1. **Dynamic Imports for Heavy Components**
   - Use `React.lazy()` for pages over 20KB
   
2. **Avoid Barrel Files**
   - Direct imports prevent tree-shaking issues
   
3. **Monitor Bundle Size**
   - Run `npm run build` to check chunk sizes
   - Keep index.js under 200KB

4. **React.memo for List Items**
   - Wrap frequently re-rendered list items with `React.memo`

5. **React Query for Server State**
   - Use `useQuery` for data fetching with automatic caching
   - Use `useMutation` for data mutations with optimistic updates

6. **Granular Code Splitting**
   - Split editor into core + extensions chunks
   - Separate collaboration libraries for lazy loading
