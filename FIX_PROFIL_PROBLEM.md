# Fixa "Kunde inte ladda profil" Problemet

## Problemet
När du öppnar appen får du felmeddelandet:
> **Kunde inte ladda profil. Se SUPABASE_DATABASE_SETUP.md för hjälp.**

Detta händer för att Supabase-databasen saknar den automatiska profiltriggern.

## Lösning (5 minuter)

### Steg 1: Öppna Supabase Dashboard
1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt för Päronsplit

### Steg 2: Öppna SQL Editor
1. Klicka på **"SQL Editor"** i menyn till vänster
2. Klicka på **"New query"** (eller liknande knapp för att skapa ny fråga)

### Steg 3: Kopiera och Kör Detta SQL-Script

**Kopiera HELA scriptet nedan och klistra in det i SQL-editorn:**

```sql
-- =====================================================
-- KOMPLETT PROFILSETUP FÖR PÄRONSPLIT
-- Kör hela detta script i Supabase SQL Editor
-- =====================================================

-- 1. Skapa profiles-tabell
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Skapa index för snabbare sökningar
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);

-- 3. Aktivera Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Skapa funktion som automatiskt skapar profiler
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

-- 5. Skapa trigger som aktiverar funktionen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Skapa säkerhetspolicies (RLS)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid()::uuid = user_id);

-- 7. Skapa profiler för befintliga användare (om det finns några)
INSERT INTO public.profiles (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Användare'),
  COALESCE(email, '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;
```

### Steg 4: Kör Scriptet
1. Klicka på **"Run"** eller **"Execute"** knappen
2. Du bör se meddelandet: **"Success. No rows returned"** eller liknande
3. Om du får ett felmeddelande, kopiera det och skicka till mig

### Steg 5: Verifiera att det Fungerar

Kör denna verifierings-query för att kontrollera att triggern är installerad:

```sql
-- Kontrollera att triggern finns
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Du bör se en rad som visar att triggern är aktiv.

### Steg 6: Testa Appen
1. Stäng och öppna appen igen
2. Om du har en befintlig användare, logga ut och in igen
3. Felet borde vara borta nu!

---

## Vad Gjorde Vi?

Detta SQL-script:
- ✅ Skapade `profiles` tabellen för användardata
- ✅ Installerade en trigger som **automatiskt skapar en profil** när någon registrerar sig
- ✅ Skapade säkerhetspolicies så att användare bara kan se sin egen profil
- ✅ Skapade profiler för alla befintliga användare

Nu kommer appen automatiskt skapa profiler för alla nya användare! 🎉

---

## Behöver du Hjälp?

Om något går fel:
1. Kopiera felmeddelandet från SQL-editorn
2. Skicka det till mig så hjälper jag dig
3. Dubbelkolla att du kopierade HELA SQL-scriptet (alla 7 steg)
