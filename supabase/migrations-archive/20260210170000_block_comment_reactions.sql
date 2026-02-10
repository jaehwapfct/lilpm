-- Block Comment Reactions
-- Allows users to react to block comments with emoji

CREATE TABLE IF NOT EXISTS public.block_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.block_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate reactions from same user with same emoji
  UNIQUE(comment_id, user_id, emoji)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_block_comment_reactions_comment_id
  ON public.block_comment_reactions(comment_id);

-- RLS
ALTER TABLE public.block_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON public.block_comment_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own reactions"
  ON public.block_comment_reactions FOR ALL
  USING (auth.uid() = user_id);
