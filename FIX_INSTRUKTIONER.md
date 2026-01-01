# Instruktioner för att Fixa User Table Migration

## Problem som fixas

Din Supabase-databas har migrerats från `profiles` till `users` tabell, men detta har orsakat följande problem:

1. ❌ **"Kunde inte ladda profil"** - när du loggar in
2. ❌ **"new row violates row-level security policy for table groups"** - när du försöker skapa grupp
3. ❌ **"operator does not exist: text = uuid"** - i RLS-policies

## Lösning

Jag har skapat ett komplett migrationsskript som fixar alla dessa problem.

### Steg 1: Öppna Supabase Dashboard

1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt (p-ronsplit-v2)
3. Klicka på **SQL Editor** i vänster menyn

### Steg 2: Kör Migrationsskriptet

Du har två alternativ:

#### Alternativ A: Använd filen (rekommenderat)

1. Öppna filen `MIGRATION_FIX_USER_TABLE.sql` i projektroten
2. Kopiera **hela innehållet** (Ctrl+A, Ctrl+C)
3. Klistra in i SQL Editor i Supabase
4. Klicka på **Run** (eller tryck Ctrl+Enter)

#### Alternativ B: Använd quick setup från dokumentationen

1. Öppna `SUPABASE_DATABASE_SETUP.md`
2. Scrolla till "Quick Setup (Copy-Paste)"
3. Kopiera SQL-skriptet därifrån
4. Klistra in i SQL Editor och kör

### Steg 3: Verifiera att det fungerar

Efter att du har kört skriptet, kör dessa verifieringsfrågor i SQL Editor:

```sql
-- Kontrollera att users-tabellen finns
SELECT COUNT(*) FROM public.users;

-- Kontrollera att views finns
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'public_profiles');

-- Kontrollera att RLS-policies finns
SELECT tablename, policyname FROM pg_policies
WHERE tablename = 'users';

-- Testa get_all_users funktionen
SELECT * FROM public.get_all_users();
```

### Steg 4: Testa i applikationen

1. **Logga in** - Du ska nu kunna logga in utan "Kunde inte ladda profil" fel
2. **Skapa en grupp** - Du ska kunna skapa en ny grupp utan RLS-fel
3. **Lägg till medlemmar** - Funktionen "Lägg till medlemmar" ska fungera

## Vad gör migrationsskriptet?

Skriptet utför följande åtgärder automatiskt:

### ✅ Databas-struktur
- Skapar/uppdaterar `public.users` tabell med korrekt struktur
- Skapar index för snabbare uppslagningar
- Aktiverar Row Level Security (RLS)

### ✅ RLS-Policies (med rätt type casting)
- Fixar "text = uuid" fel genom att använda korrekt datatyper
- Skapar policies för `users` tabell
- Fixar `groups` tabell policies

### ✅ Views för bakåtkompatibilitet
- Skapar `public.profiles` view → mappar till `users` tabell
- Skapar `public_profiles` view → för medlemslistor
- Ingen kod behöver ändras i applikationen!

### ✅ RPC Functions
- Skapar `get_all_users()` funktion
- Ger korrekt behörighet

### ✅ Triggers
- Recrear `handle_new_user()` trigger
- Nya användare får automatiskt en post i `users` tabell

### ✅ Data migration
- Backfill: kopierar befintliga `auth.users` till `public.users`
- Säker att köra flera gånger (idempotent)

## Vanliga frågor

### Kommer jag förlora någon data?
**Nej!** Skriptet använder `CREATE TABLE IF NOT EXISTS` och `ON CONFLICT DO NOTHING`, så befintlig data påverkas inte.

### Måste jag ändra någon kod?
**Nej!** Tack vare views (`profiles`, `public_profiles`) fungerar all befintlig kod utan ändringar.

### Vad händer om jag kör skriptet flera gånger?
**Inget problem!** Skriptet är idempotent, vilket betyder att det är säkert att köra flera gånger.

### Kan jag fortfarande använda "profiles" i queries?
**Ja!** Skriptet skapar en `profiles` view som automatiskt mappar till `users` tabellen.

## Teknisk bakgrund

### Varför "text = uuid" fel?

När du migrerade från `profiles` till `users`, blev `created_by` kolumnen i `groups` tabellen av typen TEXT istället för UUID. Detta orsakade fel när RLS-policies försökte jämföra:

```sql
-- Gammalt (fungerade inte):
auth.uid() = created_by  -- UUID = TEXT ❌

-- Nytt (fungerar):
auth.uid() = created_by::uuid  -- UUID = UUID ✅
```

Migrationsskriptet fixar detta genom att:
1. Konvertera `created_by` till UUID datatyp
2. Recreate alla policies med korrekt casting

### Arkitektur efter migration

```
auth.users (Supabase Auth)
    ↓ (trigger: on_auth_user_created)
public.users (huvudtabell)
    ↓ (views)
├── public.profiles (full view)
└── public_profiles (public view)
```

Applikationen kan queya både `users`, `profiles`, och `public_profiles` - alla fungerar!

## Support

Om du fortfarande har problem efter att ha kört migrationsskriptet:

1. Kontrollera Supabase logs (Dashboard → Logs)
2. Kör verifieringsfrågorna ovan
3. Kolla `SUPABASE_DATABASE_SETUP.md` under "Troubleshooting"

## Relaterade filer

- `MIGRATION_FIX_USER_TABLE.sql` - Det kompletta migrationsskriptet
- `SUPABASE_DATABASE_SETUP.md` - Uppdaterad dokumentation
- `src/hooks/useAuth.tsx` - Använder `profiles` view
- `src/hooks/useGroups.tsx` - Använder `public_profiles` view

---

**Skapad:** 2026-01-01
**Status:** ✅ Klar att köra
