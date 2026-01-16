-- Address linter findings: function search_path, invitations policies, and overly-permissive playgrounds policies

-- 1) Fix function search_path mutable (make it immutable at function level)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

-- 2) invitations: add minimally safe policies (inviter can manage; must be in the group)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Clean slate (in case policies were added manually)
DROP POLICY IF EXISTS "Inviter can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Inviter can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Inviter can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Inviter can delete invitations" ON public.invitations;

CREATE POLICY "Inviter can view invitations"
ON public.invitations
FOR SELECT
USING (
  inviter_id = auth.uid()::text
);

CREATE POLICY "Inviter can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  inviter_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = invitations.group_id
      AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Inviter can update invitations"
ON public.invitations
FOR UPDATE
USING (
  inviter_id = auth.uid()::text
)
WITH CHECK (
  inviter_id = auth.uid()::text
);

CREATE POLICY "Inviter can delete invitations"
ON public.invitations
FOR DELETE
USING (
  inviter_id = auth.uid()::text
);

-- 3) playgrounds: remove always-true policies and restrict to authenticated users
ALTER TABLE public.playgrounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.playgrounds;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.playgrounds;

CREATE POLICY "Authenticated can insert playgrounds"
ON public.playgrounds
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read playgrounds"
ON public.playgrounds
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
