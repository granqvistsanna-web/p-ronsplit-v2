
-- Fix 1: Restrict group_members INSERT to creator self-add or via a valid pending invitation.
-- Joining via invite code still works because join_group_by_invite_code is SECURITY DEFINER and bypasses RLS.
DROP POLICY IF EXISTS "Users can add themselves to groups" ON public.group_members;

CREATE POLICY "Users can join groups they created or were invited to"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid())::text = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.created_by = (auth.uid())::text
    )
    OR EXISTS (
      SELECT 1 FROM public.invitations inv
      WHERE inv.group_id = group_members.group_id
        AND inv.email = (auth.jwt() ->> 'email')
        AND COALESCE(inv.status, 'pending') IN ('pending', 'accepted')
        AND (inv.expires_at IS NULL OR inv.expires_at > now())
    )
  )
);

-- Fix 2: Allow invitees to view invitations addressed to their email so the invite flow works without exposing data.
CREATE POLICY "Invitees can view their own invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- Allow invitees to update the status of invitations addressed to them (e.g. mark as accepted/declined).
CREATE POLICY "Invitees can update their own invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));
