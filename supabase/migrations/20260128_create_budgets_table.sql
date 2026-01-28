-- Create budgets table for storing category budget limits per group
-- Budgets are synced between household members via Supabase (not localStorage)

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budgets_group_category_period_key UNIQUE (group_id, category, period)
);

-- Indexes for efficient querying
CREATE INDEX idx_budgets_group_id ON public.budgets(group_id);
CREATE INDEX idx_budgets_category ON public.budgets(category);

-- Column documentation
COMMENT ON COLUMN public.budgets.amount IS 'Budget amount stored in ore (1/100 of SEK) to prevent floating-point errors';
COMMENT ON COLUMN public.budgets.category IS 'Category identifier matching CategoryId type: mat, boende, transport, forsakringar, underhallning, prenumerationer, halsa, sparande, ovrigt';
COMMENT ON COLUMN public.budgets.period IS 'Budget period: monthly, weekly, yearly';
COMMENT ON COLUMN public.budgets.enabled IS 'Whether this budget category is actively tracked';

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access budgets for groups they belong to
-- Following the existing expenses/incomes/settlements pattern

CREATE POLICY "Users can view budgets for their groups"
ON public.budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id::text = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can create budgets for their groups"
ON public.budgets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id::text = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update budgets for their groups"
ON public.budgets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id::text = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete budgets for their groups"
ON public.budgets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id::text = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);
