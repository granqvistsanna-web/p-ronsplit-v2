-- =====================================================
-- PÄRONSPLIT PROFILER - FIXAD VERSION 2
-- Använder TEXT-casting istället för UUID-casting
-- =====================================================

-- STEG 1: Ta bort ALLA gamla policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- STEG 2: Skapa profiles-tabell (om den inte finns)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEG 3: Skapa index
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);

-- STEG 4: Aktivera RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEG 5: Skapa trigger-funktion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Användare'),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEG 6: Skapa triggern
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEG 7: Skapa policies med TEXT-casting (fungerar i alla Supabase-versioner)
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (user_id::text = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (user_id::text = auth.uid())
  WITH CHECK (user_id::text = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (user_id::text = auth.uid());

-- STEG 8: Backfill befintliga användare
INSERT INTO public.profiles (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Användare'),
  COALESCE(email, '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- KLART!
