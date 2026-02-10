-- Add project_ids column to team_invites
-- Allows inviter to select specific projects when inviting a team member
ALTER TABLE public.team_invites ADD COLUMN IF NOT EXISTS project_ids UUID[] DEFAULT NULL;

-- Comment
COMMENT ON COLUMN public.team_invites.project_ids IS 'Optional array of project IDs the invited user should be assigned to. If NULL, the auto-assign trigger assigns all projects.';
