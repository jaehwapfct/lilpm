-- Database Enhancements Migration
-- Adds parent_id, position to database_rows
-- Adds rollup_relation_id, rollup_aggregation to database_properties

-- Add parent_id for sub-items (self-referencing)
ALTER TABLE public.database_rows
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.database_rows(id) ON DELETE SET NULL;

-- Add position for row ordering
ALTER TABLE public.database_rows
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Add rollup configuration columns to properties
ALTER TABLE public.database_properties
  ADD COLUMN IF NOT EXISTS rollup_relation_id UUID REFERENCES public.database_properties(id) ON DELETE SET NULL;

ALTER TABLE public.database_properties
  ADD COLUMN IF NOT EXISTS rollup_aggregation TEXT DEFAULT 'count';

-- Index for parent_id lookups (sub-items)
CREATE INDEX IF NOT EXISTS idx_database_rows_parent_id ON public.database_rows(parent_id);

-- Index for position ordering
CREATE INDEX IF NOT EXISTS idx_database_rows_position ON public.database_rows(database_id, position);
