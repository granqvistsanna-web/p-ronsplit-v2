-- Create periods table for user-controlled month open/close
CREATE TABLE public.periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means open-ended (current period)
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- RLS policies: group members can manage periods
CREATE POLICY "Group members can view periods"
ON public.periods FOR SELECT
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Group members can create periods"
ON public.periods FOR INSERT
WITH CHECK (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Group members can update periods"
ON public.periods FOR UPDATE
USING (public.is_group_member(group_id, auth.uid()::text));

CREATE POLICY "Group members can delete periods"
ON public.periods FOR DELETE
USING (public.is_group_member(group_id, auth.uid()::text));

-- Indexes
CREATE INDEX idx_periods_group_id ON public.periods(group_id);
CREATE INDEX idx_periods_group_date ON public.periods(group_id, start_date DESC);

-- Remove month_start_day from groups (replaced by periods)
ALTER TABLE public.groups DROP COLUMN IF EXISTS month_start_day;
