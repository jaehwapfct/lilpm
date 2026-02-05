---
description: Deploy to Vercel and Supabase Edge Functions
---
# Deploy Workflow

This workflow deploys both the Vercel frontend and Supabase Edge Functions together.

## Prerequisites
- Ensure you have the Supabase CLI installed
- You must be logged into both Vercel and Supabase CLI

## Steps

// turbo-all

1. Build and verify the project locally
```bash
npm run build
```

2. Push changes to git (triggers Vercel auto-deploy)
```bash
git add -A && git commit -m "chore: deploy" && git push
```

3. Deploy Supabase Edge Functions
```bash
npx supabase functions deploy
```

4. If there are database migrations to apply:
```bash
npx supabase db push
```

## Note
Always deploy both together to ensure frontend and backend are in sync.
