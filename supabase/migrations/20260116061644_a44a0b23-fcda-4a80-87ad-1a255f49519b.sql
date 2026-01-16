-- Fix infinite recursion in RLS by using a SECURITY DEFINER helper

-- 1) Helper function (bypasses RLS) to check membership
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id text, _user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
  );
$$;

-- 2) Recreate SELECT policy on group_members without self-referencing subquery
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

CREATE POLICY "Users can view group members"
ON public.group_members
FOR SELECT
USING (public.is_group_member(group_members.group_id, auth.uid()::text));