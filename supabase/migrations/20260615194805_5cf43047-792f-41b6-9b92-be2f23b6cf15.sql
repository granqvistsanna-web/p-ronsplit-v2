
-- 1. Fix privilege escalation: only allow self-removal (existing "Users can leave groups" policy)
--    and let group creators remove anyone. Drop the overly permissive policy.
DROP POLICY IF EXISTS "Group members can remove other members" ON public.group_members;

CREATE POLICY "Group creators can remove members"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
      AND g.created_by = (auth.uid())::text
  )
);

-- 2. Rotate invite code after each successful join to prevent unbounded reuse
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _group_id text;
  _group_name text;
  _user_id text;
  _existing_member_id text;
  _new_code text;
BEGIN
  _user_id := auth.uid()::text;

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, name INTO _group_id, _group_name
  FROM public.groups
  WHERE invite_code = upper(trim(_invite_code));

  IF _group_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No group found with that code');
  END IF;

  SELECT id INTO _existing_member_id
  FROM public.group_members
  WHERE group_id = _group_id AND user_id = _user_id;

  IF _existing_member_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already a member', 'group_id', _group_id, 'group_name', _group_name);
  END IF;

  INSERT INTO public.group_members (id, group_id, user_id, joined_at)
  VALUES (gen_random_uuid()::text, _group_id, _user_id, now());

  -- Rotate the invite code so the consumed code cannot be reused
  _new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  UPDATE public.groups SET invite_code = _new_code WHERE id = _group_id;

  RETURN json_build_object('success', true, 'group_id', _group_id, 'group_name', _group_name);
END;
$function$;

-- 3. Lock down SECURITY DEFINER function execute privileges
-- handle_new_user is only used by an auth trigger; nobody else should call it
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- is_group_member is used by RLS policies; only authenticated needs it (not anon/public)
REVOKE ALL ON FUNCTION public.is_group_member(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(text, text) TO authenticated;

-- join_group_by_invite_code: signed-in users only
REVOKE ALL ON FUNCTION public.join_group_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(text) TO authenticated;
