# Phase 5: Budget Backend - Research

**Researched:** 2026-01-28
**Domain:** Budget data storage with Supabase, React Query CRUD operations
**Confidence:** HIGH

## Summary

Phase 5 implements backend infrastructure for budget tracking - creating the `budgets` table in Supabase, implementing RLS policies for group-based access control, and building a `useBudgets` React Query hook following the established pattern from `useExpenses` and `useIncomes`. The budget system allows household members to set spending limits per category, enabling Phase 6's UI to display budget vs. actual comparisons.

The standard approach follows existing patterns exactly: Supabase table with group-scoped RLS, React Query hook with filter-based query keys, integer storage for amounts (cents/öre), and mutations that invalidate list queries. The budgets table requires columns for category (string matching CategoryId type), amount (BIGINT for öre), enabled flag (boolean for per-category toggle), period (for future monthly/yearly scope), and standard group_id foreign key. RLS policies follow the expenses/incomes pattern - all group members can CRUD budgets for their household.

The key insight is that this phase is purely infrastructure - no UI, just data layer. The success criteria are testable via direct database queries and hook API. Budget amounts use the same integer storage (öre) as expenses/incomes for consistency. Categories match the existing CategoryId type ("mat", "boende", "transport", etc.) to enable joins with expense data in Phase 6.

**Primary recommendation:** Create budgets table with RLS policies identical to expenses/incomes patterns, implement useBudgets hook following useExpenses structure exactly, use existing queryKeys pattern, store amounts as BIGINT (öre), and test CRUD operations via console before Phase 6 UI.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.83.0 | CRUD operations with caching | Already used for useExpenses/useIncomes; standard pattern established |
| @supabase/supabase-js | 2.90.1 | Database client with RLS | Already configured; provides CRUD operations and real-time subscriptions |
| PostgreSQL (Supabase) | 15.x | Relational database with RLS | Already deployed; handles group-based access control via RLS policies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | (in project) | Toast notifications for mutations | Already used in useExpenses/useIncomes for success/error feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase table | localStorage | localStorage doesn't sync between household members; requirement BUD-01 explicitly states Supabase |
| Group-scoped RLS | User-scoped policies | Would prevent household members from managing shared budgets; requirement states all members can CRUD |
| Separate budget periods table | Single table with period column | Premature optimization; start simple with period column, normalize later if needed |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
# @tanstack/react-query 5.83.0, @supabase/supabase-js 2.90.1 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
p-ronsplit-v2/
├── src/
│   └── hooks/
│       ├── useBudgets.tsx          # NEW: React Query hook (follows useExpenses pattern)
│       └── queries/
│           ├── queryKeys.ts        # EXTEND: Add budgets keys
│           └── types.ts            # EXTEND: Add BudgetFilters
└── supabase/
    └── migrations/
        └── YYYYMMDD_create_budgets_table.sql  # NEW: Table + RLS policies
```

### Pattern 1: Budgets Table Schema
**What:** Database table storing budget limits per category, per group
**When to use:** Required for BUD-01 - Supabase storage with group-based RLS
**Example:**
```sql
-- Source: Project requirements + existing expenses/incomes patterns
-- supabase/migrations/YYYYMMDD_create_budgets_table.sql

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount BIGINT NOT NULL, -- Amount in öre (cents) - consistent with expenses/incomes
  enabled BOOLEAN NOT NULL DEFAULT true,
  period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly' for future expansion
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one budget per category per group per period
  UNIQUE(group_id, category, period)
);

-- Add index for common query pattern (fetch budgets for a group)
CREATE INDEX idx_budgets_group_id ON public.budgets(group_id);

-- Add comment for documentation
COMMENT ON COLUMN public.budgets.amount IS 'Budget amount in öre (1 krona = 100 öre). Stored as integer to prevent floating-point errors.';
COMMENT ON COLUMN public.budgets.category IS 'Category ID matching CategoryId type: mat, boende, transport, noje, restaurang, alkohol, klader, halsa, shopping, resor, ovrigt';
COMMENT ON COLUMN public.budgets.enabled IS 'Whether budget tracking is active for this category (BUD-03 requirement)';
```

### Pattern 2: Group-Based RLS Policies for Budgets
**What:** Row Level Security policies allowing all household members to CRUD budgets
**When to use:** Required for BUD-01 - identical pattern to expenses/incomes RLS
**Example:**
```sql
-- Source: Existing RLS pattern from expenses/incomes tables
-- Same migration file: YYYYMMDD_create_budgets_table.sql

-- Enable RLS on budgets table
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view budgets for their groups
CREATE POLICY "Users can view budgets for their groups"
ON public.budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: Users can create budgets for their groups
CREATE POLICY "Users can create budgets for their groups"
ON public.budgets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: Users can update budgets for their groups
CREATE POLICY "Users can update budgets for their groups"
ON public.budgets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: Users can delete budgets for their groups
CREATE POLICY "Users can delete budgets for their groups"
ON public.budgets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);
```

### Pattern 3: useBudgets Hook Structure
**What:** React Query hook for budget CRUD operations following useExpenses/useIncomes pattern
**When to use:** Required for BUD-01 - provides programmatic budget management
**Example:**
```typescript
// Source: Existing useExpenses.tsx and useIncomes.tsx patterns
// src/hooks/useBudgets.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { queryKeys } from "./queries/queryKeys";
import { STALE_TIME_FREQUENT } from "./queries/config";
import type { BudgetFilters } from "./queries/types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface Budget {
  id: string;
  group_id: string;
  category: string;
  amount: number; // BIGINT - stored in öre
  enabled: boolean;
  period: string;
  created_at: string;
  updated_at: string;
}

export function useBudgets(filters: BudgetFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching budgets with filters
  const query = useQuery({
    queryKey: queryKeys.budgets.list(filters),
    queryFn: async () => {
      if (!user) {
        return [];
      }

      let query = supabase
        .from("budgets")
        .select("*")
        .eq("group_id", filters.groupId)
        .order("category", { ascending: true });

      // Apply period filter if provided
      if (filters.period) {
        query = query.eq("period", filters.period);
      }

      // Apply enabled filter if provided
      if (filters.enabledOnly) {
        query = query.eq("enabled", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching budgets:", error);
        throw error;
      }

      return (data || []) as Budget[];
    },
    enabled: !!filters.groupId && !!user,
    staleTime: STALE_TIME_FREQUENT, // 30 seconds - budgets change less often than expenses
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation: Add or update budget (upsert pattern)
  const saveMutation = useMutation({
    mutationFn: async (budget: {
      group_id: string;
      category: string;
      amount: number;
      enabled: boolean;
      period?: string;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const insertData: TablesInsert<'budgets'> = {
        group_id: budget.group_id,
        category: budget.category,
        amount: budget.amount, // Already in öre from UI conversion
        enabled: budget.enabled,
        period: budget.period || "monthly",
      };

      // Upsert: Insert or update if budget exists for this category
      const { data, error } = await supabase
        .from("budgets")
        .upsert(insertData, {
          onConflict: "group_id,category,period",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget sparad!");
    },
    onError: (error) => {
      console.error("Error saving budget:", error);
      toast.error("Kunde inte spara budget");
    },
  });

  // Mutation: Update budget
  const updateMutation = useMutation({
    mutationFn: async ({
      budgetId,
      updates,
    }: {
      budgetId: string;
      updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const dbUpdates: TablesUpdate<'budgets'> = {
        amount: updates.amount,
        enabled: updates.enabled,
        category: updates.category,
        period: updates.period,
      };

      // Remove undefined fields
      const cleanUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([_, v]) => v !== undefined)
      ) as TablesUpdate<'budgets'>;

      const { error } = await supabase
        .from("budgets")
        .update(cleanUpdates)
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget uppdaterad!");
    },
    onError: (error: any) => {
      console.error("Error updating budget:", error);
      toast.error(error.message || "Kunde inte uppdatera budget");
    },
  });

  // Mutation: Delete budget
  const deleteMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget borttagen!");
    },
    onError: (error: any) => {
      console.error("Error deleting budget:", error);
      toast.error(error.message || "Kunde inte ta bort budget");
    },
  });

  return {
    budgets: query.data ?? [],
    loading: query.isLoading,
    saveBudget: saveMutation.mutateAsync,
    updateBudget: async (
      budgetId: string,
      updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>
    ) => {
      await updateMutation.mutateAsync({ budgetId, updates });
    },
    deleteBudget: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
```

### Pattern 4: Query Keys Extension for Budgets
**What:** Add budgets to centralized query key factory
**When to use:** Required for React Query cache management
**Example:**
```typescript
// Source: Existing queryKeys.ts pattern
// src/hooks/queries/queryKeys.ts (EXTEND existing file)

import type { ExpenseFilters, IncomeFilters, BudgetFilters } from './types';

export const queryKeys = {
  // ... existing expenses and incomes keys ...

  /**
   * Budget query keys.
   */
  budgets: {
    /** Base key for all budget queries - use to invalidate everything */
    all: ['budgets'] as const,
    /** Key for all budget lists - use to invalidate all filtered/unfiltered lists */
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    /** Key for a specific filtered budget list */
    list: (filters: BudgetFilters) =>
      [...queryKeys.budgets.lists(), filters] as const,
  },
} as const;
```

### Pattern 5: Budget Filter Types
**What:** TypeScript interface for budget query filters
**When to use:** Enables type-safe filtering in useBudgets hook
**Example:**
```typescript
// Source: Existing types.ts pattern
// src/hooks/queries/types.ts (EXTEND existing file)

/**
 * Filter parameters for budget queries.
 * Combines household context with optional period and enabled filters.
 */
export interface BudgetFilters {
  /** ID of the household/group to fetch budgets for */
  groupId: string;
  /** Optional period filter ('monthly' or 'yearly') */
  period?: string;
  /** Only fetch enabled budgets */
  enabledOnly?: boolean;
}
```

### Anti-Patterns to Avoid
- **Storing budget amounts as decimals:** Use BIGINT (öre) like expenses/incomes for consistency and precision
- **User-scoped RLS instead of group-scoped:** Budgets are household-level, not user-level; all members need CRUD access
- **Not using UNIQUE constraint:** Without `UNIQUE(group_id, category, period)`, duplicate budgets can be created
- **Hardcoding category values:** Categories must match CategoryId type exactly for Phase 6 joins
- **Forgetting enabled default:** Default enabled=true so newly created budgets are active immediately

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Budget CRUD operations | Custom fetch/update logic | React Query useMutation pattern | Existing useExpenses/useIncomes provide proven pattern; includes error handling, loading states, cache invalidation |
| Group-based access control | Custom permission checks | Supabase RLS policies | RLS enforced at database level; can't be bypassed by client code; same pattern as expenses/incomes |
| Budget amount storage | Custom decimal handling | BIGINT integer storage (öre) | Already solved in Phase 2; consistent with expenses/incomes; prevents floating-point errors |
| Query cache invalidation | Manual refetch calls | queryClient.invalidateQueries() | React Query handles staleness, refetching, deduplication; established pattern in existing hooks |
| Budget uniqueness enforcement | Client-side validation | PostgreSQL UNIQUE constraint | Database constraint prevents race conditions; enforced server-side; RLS handles security |

**Key insight:** This phase implements ZERO new patterns - every component (table structure, RLS policies, React Query hooks, query keys, filter types) follows existing patterns from useExpenses/useIncomes exactly. Copy-paste and adapt is the correct approach.

## Common Pitfalls

### Pitfall 1: Category Value Mismatch
**What goes wrong:** Budget created with category="groceries" but CategoryId type uses "mat"; Phase 6 UI can't match budget to expenses
**Why it happens:** Categories are strings in database but typed in TypeScript; easy to use wrong value
**How to avoid:** Reference CategoryId type directly; validate categories at database level with CHECK constraint or use ENUM; test with actual category values from existing expenses
**Warning signs:** Budget data returns but Phase 6 shows "no budget set" for categories with budgets; mismatched Swedish/English names

### Pitfall 2: Forgetting RLS Policies
**What goes wrong:** Table created but no policies added; all queries return empty results even for authenticated users
**Why it happens:** RLS enabled by default means "deny all access"; must explicitly create policies
**How to avoid:** Add RLS policies in same migration as table creation; test queries immediately with authenticated user; copy-paste policy pattern from expenses table
**Warning signs:** Empty results from useBudgets even when budgets exist in database; console errors about RLS blocking access

### Pitfall 3: Amount Unit Confusion
**What goes wrong:** UI passes amount=100 (meaning 100 kr) but hook stores as-is; budget saved as 1 kr instead of 100 kr
**Why it happens:** Expenses/incomes hooks convert kr→öre internally; budget hook must do the same
**How to avoid:** Document that useBudgets expects amounts in öre; add conversion utilities (toOre/toKronor) at UI boundary; test with real values (123.45 kr = 12345 öre)
**Warning signs:** Budgets saved with amounts 100x smaller than intended; progress bars always show 100%+ utilization

### Pitfall 4: No Unique Constraint
**What goes wrong:** User saves budget for "mat" twice; two budget rows exist for same category; UI shows duplicate entries or wrong total
**Why it happens:** Database allows duplicate rows without UNIQUE constraint; upsert logic doesn't work
**How to avoid:** Add `UNIQUE(group_id, category, period)` constraint in migration; use upsert with onConflict in mutations
**Warning signs:** Multiple budgets for same category in query results; upsert creates new rows instead of updating

### Pitfall 5: Missing Group ID Filter
**What goes wrong:** useBudgets called without groupId; query runs with empty filter; returns budgets from all groups (RLS violation) or errors
**Why it happens:** Forgot to add `enabled: !!filters.groupId` guard like useExpenses
**How to avoid:** Copy pattern exactly from useExpenses - check both user and groupId in enabled option
**Warning signs:** Queries run before household loaded; React Query errors in console; unauthorized access attempts

### Pitfall 6: Not Invalidating Budget Queries After Expense Changes
**What goes wrong:** User adds expense; budget progress bar doesn't update until page refresh
**Why it happens:** Budget vs actual comparison happens in UI; budget data is cached; expense mutations don't invalidate budget cache
**How to avoid:** Phase 6 concern, not Phase 5; budget queries should refetch when switching date ranges or when page mounts
**Warning signs:** Stale budget utilization percentages; adding expense doesn't update progress bars

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete Migration File
```sql
-- Source: Project requirements + existing table patterns
-- Migration: Create budgets table with RLS policies
-- File: supabase/migrations/20260128_create_budgets_table.sql

-- Step 1: Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount BIGINT NOT NULL, -- Amount in öre (cents)
  enabled BOOLEAN NOT NULL DEFAULT true,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One budget per category per group per period
  UNIQUE(group_id, category, period)
);

-- Step 2: Add indexes for performance
CREATE INDEX idx_budgets_group_id ON public.budgets(group_id);
CREATE INDEX idx_budgets_category ON public.budgets(category);

-- Step 3: Add column comments
COMMENT ON TABLE public.budgets IS 'Budget limits per category for each household group';
COMMENT ON COLUMN public.budgets.amount IS 'Budget amount in öre (1 krona = 100 öre). Stored as integer to prevent floating-point errors.';
COMMENT ON COLUMN public.budgets.category IS 'Category ID matching CategoryId type: mat, boende, transport, noje, restaurang, alkohol, klader, halsa, shopping, resor, ovrigt';
COMMENT ON COLUMN public.budgets.enabled IS 'Whether budget tracking is active for this category';
COMMENT ON COLUMN public.budgets.period IS 'Budget period: monthly or yearly (future expansion)';

-- Step 4: Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (identical pattern to expenses/incomes)

-- Policy: SELECT - Users can view budgets for their groups
CREATE POLICY "Users can view budgets for their groups"
ON public.budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: INSERT - Users can create budgets for their groups
CREATE POLICY "Users can create budgets for their groups"
ON public.budgets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: UPDATE - Users can update budgets for their groups
CREATE POLICY "Users can update budgets for their groups"
ON public.budgets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);

-- Policy: DELETE - Users can delete budgets for their groups
CREATE POLICY "Users can delete budgets for their groups"
ON public.budgets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = budgets.group_id
    AND gm.user_id = auth.uid()::text
  )
);
```

### Testing Budget CRUD Operations (Console Testing Before UI)
```typescript
// Source: React Query testing patterns
// Console testing approach for Phase 5 (no UI yet)

// Test in browser console after migration runs:

// 1. Import hook (in component or via dev tools)
import { useBudgets } from '@/hooks/useBudgets';

// 2. Get current household from useGroups
const { household } = useGroups();
const groupId = household.id; // e.g., "50539666-381a-486d-8595-0a280a832234"

// 3. Fetch existing budgets
const { budgets, loading } = useBudgets({ groupId });
console.log('Existing budgets:', budgets);

// 4. Create test budget
const { saveBudget } = useBudgets({ groupId });
await saveBudget({
  group_id: groupId,
  category: "mat", // Must match CategoryId
  amount: 500000, // 5000 kr in öre
  enabled: true,
});
// Should show toast: "Budget sparad!"

// 5. Verify budget created
const { budgets: updated } = useBudgets({ groupId });
console.log('After save:', updated);
// Should include budget for "mat" with amount 500000

// 6. Update budget
const matBudget = updated.find(b => b.category === "mat");
const { updateBudget } = useBudgets({ groupId });
await updateBudget(matBudget.id, { amount: 600000 }); // Change to 6000 kr
// Should show toast: "Budget uppdaterad!"

// 7. Disable budget
await updateBudget(matBudget.id, { enabled: false });
// Should show toast: "Budget uppdaterad!"

// 8. Delete budget
const { deleteBudget } = useBudgets({ groupId });
await deleteBudget(matBudget.id);
// Should show toast: "Budget borttagen!"

// 9. Verify deletion
const { budgets: final } = useBudgets({ groupId });
console.log('After delete:', final);
// Should not include "mat" budget
```

### Supabase Types Extension
```typescript
// Source: Auto-generated after migration
// src/integrations/supabase/types.ts (generated by supabase gen types)

// After running migration, regenerate types:
// npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts

// Expected addition to Database type:
export type Database = {
  public: {
    Tables: {
      // ... existing tables ...
      budgets: {
        Row: {
          id: string;
          group_id: string;
          category: string;
          amount: number; // BIGINT
          enabled: boolean;
          period: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          category: string;
          amount: number;
          enabled?: boolean;
          period?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          category?: string;
          amount?: number;
          enabled?: boolean;
          period?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ];
      };
    };
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Budget limits in localStorage | Supabase with RLS | Industry standard 2020+ | Multi-device sync, household sharing, backup/restore |
| Decimal budget amounts | Integer (cents/öre) storage | Industry standard 2015+ | Eliminates floating-point errors in budget calculations |
| Manual SQL queries | React Query with typed hooks | React Query v3+ (2021) | Automatic caching, loading states, error handling |
| User-level budgets | Group-level budgets with RLS | Multi-tenant SaaS pattern | All household members manage shared budgets |
| Separate enabled field | Soft delete (deleted_at) | Depends on use case | enabled=false allows re-enabling; soft delete for audit trail; chose enabled for BUD-03 requirement |

**Deprecated/outdated:**
- Budget apps using Redux for server state: React Query handles this better with less boilerplate
- VARCHAR for amount fields: Should use BIGINT for monetary values
- Client-side permission checks: RLS policies enforce at database level
- Normalizing categories to separate table: CategoryId type in code is source of truth; denormalized category string in budgets table for simplicity

## Open Questions

Things that couldn't be fully resolved:

1. **Budget Period Scope (Monthly vs Yearly)**
   - What we know: Success criteria mentions "period" column; likely monthly vs yearly budgets
   - What's unclear: Whether Phase 6 UI will support yearly budgets, or if monthly is MVP
   - Recommendation: Include period column with default 'monthly', but Phase 6 only implements monthly UI initially; add yearly in future iteration

2. **Budget History Tracking**
   - What we know: Budgets will be updated when user changes amounts; no explicit history requirement
   - What's unclear: Whether to track budget changes over time for reporting/analysis
   - Recommendation: Start without history table; if needed, add budgets_history table later with trigger for audit trail

3. **Category Validation**
   - What we know: Categories must match CategoryId type exactly
   - What's unclear: Whether to enforce with database CHECK constraint or rely on TypeScript types
   - Recommendation: Start with application-level validation (TypeScript); add CHECK constraint in later migration if data quality issues arise

4. **Budget Sharing vs Per-User Budgets**
   - What we know: Requirements state group-based RLS (all members can CRUD); implies shared budgets
   - What's unclear: Whether future phases need per-member budget limits (e.g., each member gets 5000 kr/month for personal spending)
   - Recommendation: Phase 5 implements shared budgets only; if per-member budgets needed, add user_id column (nullable) to budgets table in future phase

5. **Budget vs Actual Calculation Location**
   - What we know: Phase 6 shows budget vs actual spending with progress bars
   - What's unclear: Whether comparison happens in UI (client-side) or via database view/function (server-side)
   - Recommendation: Phase 6 calculates in UI - fetch budgets and expenses separately, compute client-side; simpler for MVP, can optimize with database view later

## Sources

### Primary (HIGH confidence)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Mastering Mutations in React Query | TkDodo's blog](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [useMutation | TanStack Query React Docs](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation)
- Existing codebase patterns: useExpenses.tsx, useIncomes.tsx (React Query CRUD)
- Existing RLS policies: supabase/migrations/20260115214002_*.sql (group member pattern)
- Existing table schemas: expenses, incomes tables (BIGINT for amounts)

### Secondary (MEDIUM confidence)
- [Learn SQL with PostgreSQL: Building a Budget Tracking Application](https://dev.to/kihuni/learn-sql-with-postgresql-building-a-budget-tracking-application-4ee6)
- [Designing a database schema for a budget tracker with Automigrate](https://bogoyavlensky.com/blog/db-schema-for-budget-tracker-with-automigrate/)
- [RLS and "groups" of users · supabase · Discussion #6727](https://github.com/orgs/supabase/discussions/6727)
- [The Complete Guide to React Query's useMutation](https://www.wisp.blog/blog/the-complete-guide-to-react-querys-usemutation-everything-you-need-to-know)

### Tertiary (LOW confidence)
- [Staying DRY and organised with react-query and CRUD operations](https://github.com/TanStack/query/discussions/2349)
- Budget tracking app forum discussions (general patterns, not authoritative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project; exact pattern exists in useExpenses/useIncomes
- Architecture: HIGH - Table schema follows PostgreSQL best practices; RLS pattern verified in existing migrations; React Query pattern proven in codebase
- Pitfalls: HIGH - Common issues documented in TkDodo blog and Supabase RLS docs; category mismatch and RLS confusion are real issues seen in forums

**Research date:** 2026-01-28
**Valid until:** 60 days (React Query v5 stable; Supabase RLS patterns timeless; PostgreSQL schema patterns stable)

**Key dependencies verified:**
- @tanstack/react-query: 5.83.0 (from package.json)
- @supabase/supabase-js: 2.90.1 (from package.json)
- PostgreSQL 15.x (Supabase hosted)
- Existing CategoryId type: src/lib/categoryMatcher.ts (defines valid categories)

**Integration points:**
- Existing: useExpenses and useIncomes provide CRUD pattern template
- Existing: RLS policies on expenses/incomes/settlements tables provide group access pattern
- Existing: queryKeys.ts and types.ts provide query key factory structure
- Existing: CategoryId type defines valid budget categories ("mat", "boende", etc.)
- New: budgets table in Supabase
- New: useBudgets.tsx hook following useExpenses pattern
- New: BudgetFilters type in queries/types.ts
- New: budgets query keys in queries/queryKeys.ts
- Phase 6 dependency: UI will consume useBudgets hook for budget management forms and progress bars
