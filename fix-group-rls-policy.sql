-- Fix RLS policy for groups table to allow users to create and manage groups
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Allow authenticated users to INSERT their own groups
CREATE POLICY "Users can insert their own groups"
ON groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 2. Allow users to SELECT groups they are members of
CREATE POLICY "Users can view groups they are members of"
ON groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);

-- 3. Allow group creators to UPDATE their groups
CREATE POLICY "Group creators can update their groups"
ON groups FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 4. Allow group creators to DELETE their groups
CREATE POLICY "Group creators can delete their groups"
ON groups FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 5. Ensure invite_code has a default value generator
-- First create the function if it doesn't exist
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Set default for invite_code column if not already set
ALTER TABLE groups
ALTER COLUMN invite_code
SET DEFAULT generate_invite_code();

-- 6. Ensure created_by defaults to current user
ALTER TABLE groups
ALTER COLUMN created_by
SET DEFAULT auth.uid();

-- Optional: Check current policies on groups table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'groups';
