-- Allow any group member to delete savings projects (not just creator)
DROP POLICY "Users can delete their own savings projects" ON public.savings_projects;
CREATE POLICY "Group members can delete savings projects"
ON public.savings_projects
FOR DELETE
USING (public.is_group_member(group_id, auth.uid()::text));

-- Allow any group member to update savings contributions (not just creator)
DROP POLICY "Users can update their own contributions" ON public.savings_contributions;
CREATE POLICY "Group members can update contributions"
ON public.savings_contributions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.savings_projects sp
    WHERE sp.id = savings_contributions.project_id
    AND public.is_group_member(sp.group_id, auth.uid()::text)
  )
);

-- Allow any group member to delete savings contributions (not just creator)
DROP POLICY "Users can delete their own contributions" ON public.savings_contributions;
CREATE POLICY "Group members can delete contributions"
ON public.savings_contributions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.savings_projects sp
    WHERE sp.id = savings_contributions.project_id
    AND public.is_group_member(sp.group_id, auth.uid()::text)
  )
);
