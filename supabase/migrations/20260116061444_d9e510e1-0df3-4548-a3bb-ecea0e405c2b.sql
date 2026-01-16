-- Enable RLS on public_profiles
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view public profiles of group members they share groups with
CREATE POLICY "Users can view public profiles of group members"
ON public.public_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()::text
    AND gm2.user_id = public_profiles.user_id
  )
  OR auth.uid()::text = user_id
);

-- Allow users to insert their own public profile
CREATE POLICY "Users can insert own public profile"
ON public.public_profiles
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Allow users to update their own public profile
CREATE POLICY "Users can update own public profile"
ON public.public_profiles
FOR UPDATE
USING (auth.uid()::text = user_id);