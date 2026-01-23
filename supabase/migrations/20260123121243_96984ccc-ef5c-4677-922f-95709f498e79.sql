-- 1. Ta bort den okända användaren (973c50ef...) från Banehagsgatan
DELETE FROM public.group_members 
WHERE user_id = '973c50ef-c37a-437c-93cd-599c05b2c18f' 
AND group_id = '50539666-381a-486d-8595-0a280a832234';

-- 2. Ta bort samma användare från andra grupper där den finns utan profil
DELETE FROM public.group_members 
WHERE user_id = '973c50ef-c37a-437c-93cd-599c05b2c18f';

-- 3. Skapa public_profile för granqvistsanna@gmail.com så hon syns korrekt
INSERT INTO public.public_profiles (id, user_id, name, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  '184e413b-276a-443e-87d5-951c723a5622',
  'Sanna',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- 4. Uppdatera handle_new_user trigger för att OCKSÅ skapa public_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skapa profil i profiles-tabellen
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  -- Skapa ÄVEN public_profile så andra gruppmedlemmar kan se namnet
  INSERT INTO public.public_profiles (id, user_id, name, created_at, updated_at)
  VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$;