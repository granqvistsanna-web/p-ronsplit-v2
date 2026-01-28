-- Add icon column to budgets table for custom category emojis
ALTER TABLE public.budgets
ADD COLUMN icon TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.budgets.icon IS 'Custom emoji/icon for the budget category';
