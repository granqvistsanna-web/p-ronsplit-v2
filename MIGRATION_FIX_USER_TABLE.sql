-- =====================================================
-- MIGRATION: Fix Users Table and RLS Policies
-- Päronsplit - User Table Migration Fix
-- =====================================================
--
-- This migration fixes:
-- 1. Type casting errors in RLS policies (text = uuid)
-- 2. Missing public_profiles view
-- 3. Missing get_all_users RPC function
-- 4. Updates profiles table references to work with new schema
--
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Step 1: Check current table structure and create users table if needed
-- (This assumes you already have a users table in public schema)

-- If your users are in public.users, ensure it has the correct structure:
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_user_id_idx ON public.users(user_id);

-- Step 2: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop old policies if they exist (to recreate with correct types)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

-- Step 4: Create RLS policies with proper type casting
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.users
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: Create public_profiles VIEW (for backwards compatibility)
DROP VIEW IF EXISTS public.public_profiles;
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  name
FROM public.users;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Step 6: Create profiles alias (if your app still references 'profiles')
-- This makes 'profiles' and 'users' interchangeable
DROP VIEW IF EXISTS public.profiles;
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id,
  user_id,
  name,
  email,
  created_at,
  updated_at
FROM public.users;

-- Grant access to profiles view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Step 7: Create or replace the auto-create user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Användare'),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Create get_all_users RPC function
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_id,
    u.name
  FROM public.users u
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- Step 10: Fix groups table RLS policies (fix text = uuid errors)
-- First, ensure created_by is UUID type
DO $$
BEGIN
  -- Check if created_by column exists and is not UUID
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'groups'
    AND column_name = 'created_by'
    AND data_type != 'uuid'
  ) THEN
    -- Convert created_by to UUID if it's not already
    ALTER TABLE public.groups
    ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
  END IF;
END $$;

-- Drop old group policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can insert groups" ON public.groups;

-- Recreate group policies with proper UUID casting
CREATE POLICY "Users can view groups they are members of"
  ON public.groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by::uuid);

CREATE POLICY "Users can update their own groups"
  ON public.groups
  FOR UPDATE
  USING (auth.uid() = created_by::uuid)
  WITH CHECK (auth.uid() = created_by::uuid);

CREATE POLICY "Users can delete their own groups"
  ON public.groups
  FOR DELETE
  USING (auth.uid() = created_by::uuid);

-- Step 11: Backfill users table from auth.users if needed
INSERT INTO public.users (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Användare'),
  COALESCE(email, '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.users)
ON CONFLICT (user_id) DO NOTHING;

-- Step 12: Verify the setup
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';

  -- Check function
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users';

  -- Output results
  RAISE NOTICE '✓ Trigger exists: %', (trigger_count > 0);
  RAISE NOTICE '✓ Function exists: %', (function_count > 0);
  RAISE NOTICE '✓ Policies count: %', policy_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
--
-- What was fixed:
-- ✓ Created/updated users table structure
-- ✓ Fixed RLS policies with proper UUID type casting
-- ✓ Created public_profiles view for app compatibility
-- ✓ Created profiles view alias for backwards compatibility
-- ✓ Created get_all_users() RPC function
-- ✓ Fixed groups table RLS policies
-- ✓ Backfilled existing auth.users into users table
--
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Check the NOTICE messages to verify setup
-- 3. Test login and group creation
-- =====================================================
