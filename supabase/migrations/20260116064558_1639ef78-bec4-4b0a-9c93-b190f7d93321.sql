-- Create a function to join a group by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id text;
  _group_name text;
  _user_id text;
  _existing_member_id text;
BEGIN
  _user_id := auth.uid()::text;
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find group by invite code
  SELECT id, name INTO _group_id, _group_name
  FROM public.groups
  WHERE invite_code = upper(trim(_invite_code));
  
  IF _group_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No group found with that code');
  END IF;
  
  -- Check if user is already a member
  SELECT id INTO _existing_member_id
  FROM public.group_members
  WHERE group_id = _group_id AND user_id = _user_id;
  
  IF _existing_member_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already a member', 'group_id', _group_id, 'group_name', _group_name);
  END IF;
  
  -- Add user as member
  INSERT INTO public.group_members (id, group_id, user_id, joined_at)
  VALUES (gen_random_uuid()::text, _group_id, _user_id, now());
  
  RETURN json_build_object('success', true, 'group_id', _group_id, 'group_name', _group_name);
END;
$$;