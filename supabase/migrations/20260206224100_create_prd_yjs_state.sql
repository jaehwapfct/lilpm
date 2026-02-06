-- Create prd_yjs_state table for persisting Yjs document state
-- This enables recovery of collaborative editing sessions

CREATE TABLE IF NOT EXISTS prd_yjs_state (
    prd_id uuid PRIMARY KEY REFERENCES prds(id) ON DELETE CASCADE,
    state text NOT NULL,  -- Base64-encoded Yjs state
    updated_at timestamptz DEFAULT now()
);

-- Add index for updated_at to help with cleanup queries
CREATE INDEX idx_prd_yjs_state_updated_at ON prd_yjs_state(updated_at);

-- Enable RLS
ALTER TABLE prd_yjs_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write Yjs state for PRDs in their team
CREATE POLICY "prd_yjs_state_team_access" ON prd_yjs_state
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM prds p
            JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.id = prd_yjs_state.prd_id
            AND tm.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON prd_yjs_state TO authenticated;

-- Comment for documentation
COMMENT ON TABLE prd_yjs_state IS 'Stores Yjs CRDT state for collaborative PRD editing';
COMMENT ON COLUMN prd_yjs_state.state IS 'Base64-encoded Yjs document state for recovery';
