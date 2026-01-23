-- Drop the old owner-only policy
DROP POLICY IF EXISTS "Group owners can remove members" ON public.group_members;

-- Create new policy allowing any group member to remove other members
CREATE POLICY "Group members can remove other members" 
ON public.group_members
FOR DELETE 
USING (
  is_group_member(group_id, (auth.uid())::text)
);