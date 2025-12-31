# Fix group creation - Add RLS policies for groups table

## Summary
Fixes the issue where users cannot create new groups due to missing Row Level Security (RLS) policies on the `groups` table.

## Problem
Users were getting error: `new row violates row-level security policy for table "groups"` when attempting to create a new group.

**Error message:**
```
code: '42501',
message: 'new row violates row-level security policy for table "groups"'
```

## Solution
This PR adds:

1. **SQL script** (`fix-group-rls-policy.sql`) with RLS policies:
   - ✅ Allow authenticated users to INSERT their own groups
   - ✅ Allow users to SELECT groups they are members of
   - ✅ Allow group creators to UPDATE their groups
   - ✅ Allow group creators to DELETE their groups
   - ✅ Auto-generation of `invite_code` field
   - ✅ Default `created_by` to current user

2. **Diagnostic script** (`debug-group-creation.js`) for troubleshooting group creation issues in the browser console

## Files Changed
- `fix-group-rls-policy.sql` - SQL script to add RLS policies
- `debug-group-creation.js` - Browser diagnostic tool

## Instructions to Apply
1. Merge this PR
2. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
3. Copy and run the SQL script from `fix-group-rls-policy.sql`
4. Test creating a new group in the app

## Test plan
- [x] Identified the RLS policy error in browser console
- [x] Created SQL script with proper RLS policies
- [ ] Apply SQL script in Supabase Dashboard
- [ ] Test group creation in the app
- [ ] Verify users can create, view, update, and delete their groups

## Related
- Fixes group creation error (error code 42501)
- Builds on previous fix from commit `1f62704`
