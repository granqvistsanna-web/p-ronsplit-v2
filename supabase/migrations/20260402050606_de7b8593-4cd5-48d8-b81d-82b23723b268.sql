UPDATE public.settlements
SET id = gen_random_uuid()::text
WHERE id IS NULL;

UPDATE public.settlements
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.settlements
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.settlements
ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.settlements'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.settlements
ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.settlements
ALTER COLUMN created_at SET NOT NULL;