-- Step 1: Fix null values first
UPDATE public.incomes SET id = gen_random_uuid()::text WHERE id IS NULL;
UPDATE public.incomes SET created_at = now() WHERE created_at IS NULL;
UPDATE public.incomes SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.incomes SET repeat = 'none' WHERE repeat IS NULL;
UPDATE public.incomes SET included_in_split = true WHERE included_in_split IS NULL;

-- Step 2: Add defaults
ALTER TABLE public.incomes 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN type SET DEFAULT 'other',
  ALTER COLUMN repeat SET DEFAULT 'none',
  ALTER COLUMN included_in_split SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Step 3: Set NOT NULL constraints
ALTER TABLE public.incomes 
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN group_id SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN recipient SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN repeat SET NOT NULL,
  ALTER COLUMN included_in_split SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Step 4: Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'incomes_pkey' AND conrelid = 'public.incomes'::regclass
  ) THEN
    ALTER TABLE public.incomes ADD PRIMARY KEY (id);
  END IF;
END $$;