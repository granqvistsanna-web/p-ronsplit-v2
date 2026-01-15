-- Enable RLS on group_members if not already enabled
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Allow users to insert themselves as group members
CREATE POLICY "Users can add themselves to groups"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Allow users to view members of groups they belong to
CREATE POLICY "Users can view group members"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Allow users to leave groups (delete their own membership)
CREATE POLICY "Users can leave groups"
ON public.group_members
FOR DELETE
USING (auth.uid()::text = user_id);

-- Also add RLS policies for expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses for their groups"
ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = expenses.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can create expenses for their groups"
ON public.expenses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = expenses.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update expenses for their groups"
ON public.expenses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = expenses.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete expenses for their groups"
ON public.expenses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = expenses.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Add RLS policies for incomes table
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incomes for their groups"
ON public.incomes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = incomes.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can create incomes for their groups"
ON public.incomes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = incomes.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update incomes for their groups"
ON public.incomes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = incomes.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete incomes for their groups"
ON public.incomes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = incomes.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Add RLS policies for settlements table
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settlements for their groups"
ON public.settlements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = settlements.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can create settlements for their groups"
ON public.settlements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = settlements.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update settlements for their groups"
ON public.settlements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = settlements.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete settlements for their groups"
ON public.settlements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = settlements.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Fix groups policy to also allow viewing groups where user is a member
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;

CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING (
  auth.uid()::text = created_by
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = auth.uid()::text
  )
);

-- Allow users to update and delete their own groups
CREATE POLICY "Users can update their groups"
ON public.groups
FOR UPDATE
USING (auth.uid()::text = created_by);

CREATE POLICY "Users can delete their groups"
ON public.groups
FOR DELETE
USING (auth.uid()::text = created_by);