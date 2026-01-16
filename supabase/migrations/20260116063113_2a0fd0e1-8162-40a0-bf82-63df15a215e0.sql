-- Create savings_projects table
CREATE TABLE public.savings_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount BIGINT NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings_contributions table
CREATE TABLE public.savings_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.savings_projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

-- RLS for savings_projects: users can manage projects in groups they belong to
CREATE POLICY "Users can view savings projects for their groups"
ON public.savings_projects
FOR SELECT
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can create savings projects for their groups"
ON public.savings_projects
FOR INSERT
WITH CHECK (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can update savings projects for their groups"
ON public.savings_projects
FOR UPDATE
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Users can delete their own savings projects"
ON public.savings_projects
FOR DELETE
USING (created_by = auth.uid()::text);

-- RLS for savings_contributions: users can manage contributions in projects they can access
CREATE POLICY "Users can view contributions for accessible projects"
ON public.savings_contributions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.savings_projects sp
    WHERE sp.id = savings_contributions.project_id
    AND public.is_group_member(sp.group_id, auth.uid()::text)
  )
);

CREATE POLICY "Users can create contributions for accessible projects"
ON public.savings_contributions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.savings_projects sp
    WHERE sp.id = savings_contributions.project_id
    AND public.is_group_member(sp.group_id, auth.uid()::text)
  )
);

CREATE POLICY "Users can update their own contributions"
ON public.savings_contributions
FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own contributions"
ON public.savings_contributions
FOR DELETE
USING (user_id = auth.uid()::text);

-- Index for performance
CREATE INDEX idx_savings_projects_group_id ON public.savings_projects(group_id);
CREATE INDEX idx_savings_contributions_project_id ON public.savings_contributions(project_id);
CREATE INDEX idx_savings_contributions_user_id ON public.savings_contributions(user_id);