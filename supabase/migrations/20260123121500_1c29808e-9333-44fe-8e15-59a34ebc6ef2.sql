-- Allow group owners to remove members from their groups
CREATE POLICY "Group owners can remove members"
ON public.group_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = (auth.uid())::text
  )
);