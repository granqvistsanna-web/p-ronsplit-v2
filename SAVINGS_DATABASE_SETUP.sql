-- Päronsplit: Savings Feature Database Setup
-- Run this in Supabase SQL Editor

-- ================================================
-- 1. Create savings_projects table
-- ================================================
CREATE TABLE IF NOT EXISTS public.savings_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster group lookups
CREATE INDEX IF NOT EXISTS savings_projects_group_id_idx ON public.savings_projects(group_id);

-- Enable Row Level Security
ALTER TABLE public.savings_projects ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.savings_projects IS 'Shared savings projects within groups (e.g., Barnsparande, Semesterkassa)';


-- ================================================
-- 2. Create savings_contributions table
-- ================================================
CREATE TABLE IF NOT EXISTS public.savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.savings_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS savings_contributions_project_id_idx ON public.savings_contributions(project_id);
CREATE INDEX IF NOT EXISTS savings_contributions_user_id_idx ON public.savings_contributions(user_id);
CREATE INDEX IF NOT EXISTS savings_contributions_date_idx ON public.savings_contributions(date);

-- Enable Row Level Security
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.savings_contributions IS 'Individual contributions to savings projects';


-- ================================================
-- 3. Row Level Security Policies
-- ================================================

-- Savings Projects Policies
-- -------------------------

-- Users can read projects in their groups
CREATE POLICY "Users can read savings projects in their groups"
  ON public.savings_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = savings_projects.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can create projects in their groups
CREATE POLICY "Users can create savings projects in their groups"
  ON public.savings_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = savings_projects.group_id
        AND gm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update projects in their groups
CREATE POLICY "Users can update savings projects in their groups"
  ON public.savings_projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = savings_projects.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can delete projects they created
CREATE POLICY "Users can delete own savings projects"
  ON public.savings_projects
  FOR DELETE
  USING (created_by = auth.uid());


-- Savings Contributions Policies
-- ------------------------------

-- Users can read contributions for projects in their groups
CREATE POLICY "Users can read contributions in their groups"
  ON public.savings_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.savings_projects sp
      JOIN public.group_members gm ON gm.group_id = sp.group_id
      WHERE sp.id = savings_contributions.project_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can create contributions to projects in their groups
CREATE POLICY "Users can create contributions in their groups"
  ON public.savings_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.savings_projects sp
      JOIN public.group_members gm ON gm.group_id = sp.group_id
      WHERE sp.id = savings_contributions.project_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can update their own contributions
CREATE POLICY "Users can update own contributions"
  ON public.savings_contributions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own contributions
CREATE POLICY "Users can delete own contributions"
  ON public.savings_contributions
  FOR DELETE
  USING (user_id = auth.uid());


-- ================================================
-- 4. Grant Permissions
-- ================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_contributions TO authenticated;


-- ================================================
-- 5. Verification Queries (Optional - for testing)
-- ================================================
-- Uncomment to verify the setup:

-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('savings_projects', 'savings_contributions')
-- ORDER BY table_name, ordinal_position;

-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE tablename IN ('savings_projects', 'savings_contributions');
