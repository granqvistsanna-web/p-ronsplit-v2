-- Fix incomes RLS policies to use is_group_member helper function
-- This avoids recursive RLS issues with group_members table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view incomes for their groups" ON public.incomes;
DROP POLICY IF EXISTS "Users can create incomes for their groups" ON public.incomes;
DROP POLICY IF EXISTS "Users can update incomes for their groups" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete incomes for their groups" ON public.incomes;

-- Recreate policies using is_group_member helper (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Users can view incomes for their groups"
ON public.incomes
FOR SELECT
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can create incomes for their groups"
ON public.incomes
FOR INSERT
WITH CHECK (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can update incomes for their groups"
ON public.incomes
FOR UPDATE
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can delete incomes for their groups"
ON public.incomes
FOR DELETE
USING (public.is_group_member(group_id, auth.uid()::text));