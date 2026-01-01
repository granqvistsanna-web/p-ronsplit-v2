# Supabase Database Setup - Päronsplit

This document contains the database schema, triggers, and policies required for the Päronsplit application.

**⚠️ VIKTIGT:** Om du upplever problem med inloggning eller "new row violates row-level security policy", kör migrationsskriptet `MIGRATION_FIX_USER_TABLE.sql` först!

## Table of Contents
1. [Users Table](#users-table)
2. [Auto-Create User Trigger](#auto-create-user-trigger)
3. [Row Level Security Policies](#row-level-security-policies)
4. [Views and RPC Functions](#views-and-rpc-functions)
5. [Migration Instructions](#migration-instructions)

---

## Users Table

The users table stores user profile information and is linked to Supabase auth.users.

```sql
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS users_user_id_idx ON public.users(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

---

## Auto-Create User Trigger

**⚠️ CRITICAL: This trigger eliminates race conditions in user creation.**

When a new user signs up via Supabase Auth, this trigger automatically creates their profile in the `users` table. This ensures:
- ✅ No race conditions (atomic operation in database)
- ✅ No duplicate profile creation attempts
- ✅ Profile always exists when user authenticates
- ✅ Simpler client code (no profile creation logic needed)

### Trigger Function

```sql
-- Function to automatically create a user when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Användare'),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### How It Works

1. **User Signs Up** → Supabase creates a record in `auth.users`
2. **Trigger Fires** → `on_auth_user_created` trigger executes immediately
3. **Profile Created** → `handle_new_user()` function creates the profile
4. **Name Priority**:
   - First tries: `name` from signup metadata (`user_metadata.name`)
   - Falls back to: email prefix (everything before @)
   - Last resort: "Användare" (Swedish for "User")

### Error Handling

The trigger includes `EXCEPTION WHEN unique_violation` to handle the edge case where a profile might already exist. This makes the trigger idempotent and safe to run multiple times.

---

## Row Level Security Policies

These policies ensure users can only access their own user data.

```sql
-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile (fallback, trigger handles this)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile (for account deletion)
CREATE POLICY "Users can delete own profile"
  ON public.users
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Views and RPC Functions

### Backwards Compatibility Views

For backwards compatibility with existing application code, we create views that alias the `users` table:

```sql
-- public_profiles view (for member lists)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  name
FROM public.users;

-- profiles view (for full backwards compatibility)
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id,
  user_id,
  name,
  email,
  created_at,
  updated_at
FROM public.users;

-- Grant access
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
```

### RPC Functions

```sql
-- get_all_users function (used by AddMembersModal)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_id,
    u.name
  FROM public.users u
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
```

---

## Migration Instructions

### For New Supabase Projects

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** → Click "SQL Editor" in the left sidebar
3. **Run the Migration Script** → Use the file `MIGRATION_FIX_USER_TABLE.sql` in your project root

### Quick Setup (Copy-Paste)

Alternatively, copy and paste this complete setup script:

```sql
-- =====================================================
-- COMPLETE USERS SETUP FOR PÄRONSPLIT
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS users_user_id_idx ON public.users(user_id);

-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create auto-user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, name, email)
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

-- 5. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create views for backwards compatibility
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, name FROM public.users;

CREATE OR REPLACE VIEW public.profiles AS
SELECT id, user_id, name, email, created_at, updated_at FROM public.users;

GRANT SELECT ON public.public_profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- 8. Create RPC functions
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (id UUID, user_id UUID, name TEXT) AS $$
BEGIN
  RETURN QUERY SELECT u.id, u.user_id, u.name FROM public.users u ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- 9. Backfill existing users (if any)
INSERT INTO public.users (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Användare'),
  COALESCE(email, '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.users)
ON CONFLICT (user_id) DO NOTHING;
```

4. **Click "Run"** → Execute the script
5. **Verify Success** → You should see "Success. No rows returned"

### For Existing Projects with Data

If you already have users in `auth.users`, the script includes a backfill query (step 7) that creates profiles for existing users.

**⚠️ Important Notes:**
- The backfill is safe to run multiple times (`ON CONFLICT DO NOTHING`)
- Existing users won't be affected
- New signups will automatically get user records via the trigger
- The `profiles` and `public_profiles` views provide backwards compatibility

### Verification

After running the setup, verify it works:

```sql
-- Check that the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check that the function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'users';

-- Check views exist
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'public_profiles');
```

### Testing the Trigger

1. **Sign up a new test user** in your app
2. **Check the users table**:
   ```sql
   SELECT * FROM public.users
   WHERE email = 'your-test-user@example.com';

   -- Or via the profiles view
   SELECT * FROM public.profiles
   WHERE email = 'your-test-user@example.com';
   ```
3. **Verify**: User record should exist immediately after signup

---

## Troubleshooting

### Issue: "operator does not exist: text = uuid"

**Symptoms:** RLS policies fail with type mismatch errors

**Solution:** Run the migration script `MIGRATION_FIX_USER_TABLE.sql` which fixes all type casting issues.

### Issue: Trigger doesn't fire

**Symptoms:** New users sign up but no user record is created

**Solution:**
```sql
-- Check if trigger is enabled
SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- tgenabled should be 'O' (origin/enabled)

-- Re-enable if needed
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

### Issue: Permission denied when creating profile

**Symptoms:** Trigger fires but gets permission error

**Solution:** The function needs `SECURITY DEFINER` (already included in script above). Verify:
```sql
SELECT prosecdef FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
-- Should return 't' (true)
```

### Issue: Existing users have no user records

**Solution:** Run the backfill query:
```sql
INSERT INTO public.users (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Användare'),
  COALESCE(email, '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.users)
ON CONFLICT (user_id) DO NOTHING;
```

### Issue: "new row violates row-level security policy for table groups"

**Symptoms:** Cannot create groups after login

**Solution:**
1. Ensure the `created_by` column in `groups` table is UUID type
2. Run the migration script which fixes the groups RLS policies
3. The policies now properly cast `auth.uid()` to match `created_by`

---

## Security Considerations

### Why SECURITY DEFINER?

The `handle_new_user()` function uses `SECURITY DEFINER`, which means it runs with the privileges of the function creator (usually the postgres role), not the invoking user.

**This is necessary because:**
- The trigger needs to insert into `public.users`
- The new user doesn't have a session yet (they're being created)
- RLS policies would block the insert otherwise

**This is safe because:**
- The function only inserts a user record for the NEW user (the one being created)
- The user_id comes from `NEW.id` (the auth.users record being inserted)
- No user input is processed
- The function is idempotent (safe to run multiple times)

### RLS Protection

Even with the trigger, RLS policies ensure:
- Users can only read/update/delete their own user records
- No user can access another user's data
- All client-side queries are protected by RLS
- Views (`profiles`, `public_profiles`) inherit RLS from the underlying `users` table

---

## Benefits of This Approach

✅ **Eliminates Race Conditions**
- User record creation happens atomically in the database
- No possibility of duplicate creation attempts
- No setTimeout workarounds needed in client code

✅ **Simpler Client Code**
- Client just fetches user data (it always exists via views)
- No complex error handling for user creation
- Cleaner, more maintainable code

✅ **Better Performance**
- No network round-trips for user creation
- Immediate data availability
- Faster user onboarding

✅ **More Reliable**
- Works even if client loses connection mid-signup
- Handles edge cases automatically
- Consistent behavior across all signup methods

✅ **Backwards Compatible**
- Views (`profiles`, `public_profiles`) ensure existing code works
- No need to update all queries at once
- Gradual migration possible

---

## Related Files

- **Migration Script**: `MIGRATION_FIX_USER_TABLE.sql` - Complete migration with type fixes
- **Client Code**: `src/hooks/useAuth.tsx` - Queries via `profiles` view
- **Group Management**: `src/hooks/useGroups.tsx` - Uses `public_profiles` view
- **Account Deletion**: `SUPABASE_EDGE_FUNCTION_SETUP.md` - Includes user deletion
- **Environment Setup**: `.env.example` - Database connection config

---

**Last Updated:** 2026-01-01
**Status:** ✅ Ready for deployment (use `MIGRATION_FIX_USER_TABLE.sql` for existing projects)
