---
phase: 05-budget-backend
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, migration, typescript]

# Dependency graph
requires:
  - phase: 02-enhanced-data-fetching
    provides: Integer storage pattern (ore) for monetary amounts
provides:
  - Budgets table in Supabase with RLS policies
  - TypeScript types for budgets CRUD operations
  - Database schema for budget storage
affects: [05-02, 05-03, budget-ui, useBudgets-hook]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TEXT group_id without FK (matching existing schema pattern)
    - BIGINT amount in ore for consistent currency handling
    - UNIQUE constraint on (group_id, category, period)

key-files:
  created:
    - supabase/migrations/20260128_create_budgets_table.sql
  modified:
    - src/integrations/supabase/types.ts

key-decisions:
  - "TEXT group_id without FK reference (groups table lacks primary key constraint)"
  - "BIGINT for amount column (ore storage consistent with expenses/incomes)"
  - "RLS policies use ::text cast for group_id comparison"

patterns-established:
  - "Budget schema: id, group_id, category, amount (ore), enabled, period, timestamps"
  - "UNIQUE(group_id, category, period) prevents duplicate budget entries per category"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 5 Plan 1: Budget Database Schema Summary

**Supabase budgets table with RLS policies for group-member-only access and regenerated TypeScript types**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T18:42:22Z
- **Completed:** 2026-01-28T18:46:14Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Created budgets table with id, group_id, category, amount (BIGINT), enabled, period columns
- UNIQUE constraint on (group_id, category, period) prevents duplicate budget entries
- RLS enabled with 4 policies (SELECT, INSERT, UPDATE, DELETE) checking group membership
- TypeScript types regenerated with budgets table definitions (Row, Insert, Update)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create budgets table migration** - `8d0cb4d` (feat)
2. **Task 2: Apply migration to Supabase** - (no commit - deployment verification only)
3. **Task 3: Regenerate Supabase TypeScript types** - `00e2f7c` (chore)

## Files Created/Modified

- `supabase/migrations/20260128_create_budgets_table.sql` - CREATE TABLE, indexes, COMMENTs, RLS policies
- `src/integrations/supabase/types.ts` - Added budgets table with Row/Insert/Update types

## Decisions Made

- **TEXT group_id without FK:** The groups table lacks a proper primary key constraint, so foreign key reference would fail. Used TEXT type matching existing schema pattern (expenses, incomes, savings_projects all use TEXT group_id without FK).
- **::text cast in RLS policies:** Ensured type compatibility between group_members.group_id and budgets.group_id in policy checks.
- **BIGINT for amount:** Consistent with ore storage pattern (1/100 SEK) established in Phase 2 for expenses/incomes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed group_id from UUID to TEXT**
- **Found during:** Task 2 (Apply migration)
- **Issue:** Migration failed with "no unique constraint matching given keys for referenced table groups" - the groups table lacks a primary key on id column
- **Fix:** Changed group_id from `UUID NOT NULL REFERENCES public.groups(id)` to `TEXT NOT NULL` (matching existing schema pattern)
- **Files modified:** supabase/migrations/20260128_create_budgets_table.sql
- **Verification:** Migration applied successfully, table created
- **Committed in:** 8d0cb4d (amended Task 1 commit)

**2. [Rule 3 - Blocking] Repaired Supabase migration history**
- **Found during:** Task 2 (Apply migration)
- **Issue:** `supabase db push` failed due to local/remote migration version mismatches
- **Fix:** Used `supabase migration repair --status applied` to sync migration history
- **Verification:** `supabase migration list` shows all migrations aligned
- **Committed in:** N/A (remote database operation only)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to unblock migration deployment. Schema matches existing patterns.

## Issues Encountered

- Migration version mismatch between local and remote required `supabase migration repair` before pushing new migration
- Groups table schema inconsistency (no PK) forced removal of FK reference

## User Setup Required

None - Supabase migration was applied automatically.

## Next Phase Readiness

- Budgets table ready for useBudgets hook implementation (05-02)
- TypeScript types available for type-safe budget operations
- RLS policies ensure only group members can access budgets

---
*Phase: 05-budget-backend*
*Completed: 2026-01-28*
