
-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update their groups" ON public.groups;

-- Create new policy allowing all group members to update group settings
CREATE POLICY "Group members can update their groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (
  is_group_member(id, (auth.uid())::text)
)
WITH CHECK (
  is_group_member(id, (auth.uid())::text)
);
