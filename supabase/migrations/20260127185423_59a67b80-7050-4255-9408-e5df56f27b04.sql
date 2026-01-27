-- Fix expenses with NULL IDs by generating UUIDs
UPDATE public.expenses
SET id = gen_random_uuid()::text
WHERE id IS NULL;

-- Fix NULL values in other columns
UPDATE public.expenses
SET 
  created_at = COALESCE(created_at, now()),
  category = COALESCE(category, 'ovrigt'),
  repeat = COALESCE(repeat, 'none'),
  description = COALESCE(description, ''),
  date = COALESCE(date, to_char(now(), 'YYYY-MM-DD'))
WHERE 
  created_at IS NULL 
  OR category IS NULL 
  OR repeat IS NULL 
  OR description IS NULL 
  OR date IS NULL;

-- Add NOT NULL constraints and DEFAULT values to expenses table
ALTER TABLE public.expenses 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.expenses 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.expenses 
  ALTER COLUMN category SET DEFAULT 'ovrigt',
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.expenses 
  ALTER COLUMN repeat SET DEFAULT 'none',
  ALTER COLUMN repeat SET NOT NULL;

-- Add primary key constraint on id
ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);