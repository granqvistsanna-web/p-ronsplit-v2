# Phase 2: Enhanced Data Fetching - Research

**Researched:** 2026-01-28
**Domain:** React Query integration with Supabase for filtered data fetching
**Confidence:** HIGH

## Summary

Phase 2 converts the existing useState-based data hooks (useExpenses, useIncomes) to React Query hooks that accept filter parameters and automatically refetch when those parameters change. The current implementation manually fetches data using `fetchExpenses()` and stores results in local state. This phase modernizes the data layer to leverage React Query's caching, automatic refetching, and loading state management.

The standard approach uses React Query's `useQuery` with dynamic query keys that include filter parameters. When filters change (date range, member IDs), the query key changes, triggering an automatic refetch. The existing Supabase query builders support all necessary filter operations (`.gte()`, `.lte()`, `.eq()`, `.in()`). For currency storage, the requirement to use integers (cents) is already partially implemented - incomes store in cents with `/100` conversion on read, but expenses currently store as decimals and need migration.

The key architectural pattern is the Query Key Factory - centralized functions that generate consistent query keys with filter dependencies. This ensures proper cache invalidation and automatic refetching behavior. Charts will automatically update through React Query's reactive cache system when filter parameters in URL change (implemented in Phase 1).

**Primary recommendation:** Convert useExpenses and useIncomes to use React Query with filter-aware query keys, implement query key factory pattern, add currency integer storage migration for expenses table, and leverage enabled option for dependent queries where household ID is required.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.83.0 | Server state management with caching | Already in project; industry standard for async state; handles caching, refetching, loading states automatically |
| @supabase/supabase-js | 2.90.1 | Database client with filter builders | Already in project; provides `.gte()`, `.lte()`, `.eq()`, `.in()` for filtering; handles RLS automatically |
| React Router DOM | 6.30.1 | URL state management (Phase 1) | Already integrated; provides filter params that trigger React Query refetches |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.6.0 | Date range calculations | Already in project; convert URL date presets to start/end dates for Supabase filters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Query | SWR | SWR is simpler but React Query already in use (useAllUsers.tsx); consistency over change |
| Manual refetch | Supabase realtime subscriptions | Realtime adds complexity; polling/manual refetch sufficient for analytics; consider for Phase 3+ |
| Integer cents storage | Decimal(10,2) in database | Decimal avoids migration but doesn't prevent floating-point errors in JS calculations; requirement explicitly states integers |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
# @tanstack/react-query 5.83.0, @supabase/supabase-js 2.90.1 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useExpenses.tsx       # Convert to React Query
│   ├── useIncomes.tsx        # Convert to React Query
│   └── queries/
│       ├── queryKeys.ts      # Query key factory
│       └── types.ts          # Filter types
└── lib/
    ├── types.ts              # Currency types (already exists)
    └── currency.ts           # Currency conversion utils
```

### Pattern 1: Query Key Factory with Filters
**What:** Centralized functions that generate consistent query keys including filter parameters
**When to use:** All data hooks that accept filter parameters; ensures proper cache invalidation
**Example:**
```typescript
// Source: TkDodo's blog + TanStack Query docs
// hooks/queries/queryKeys.ts

export const queryKeys = {
  // Base keys
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters: ExpenseFilters) =>
      [...queryKeys.expenses.lists(), filters] as const,
    details: () => [...queryKeys.expenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.expenses.details(), id] as const,
  },
  incomes: {
    all: ['incomes'] as const,
    lists: () => [...queryKeys.incomes.all, 'list'] as const,
    list: (filters: IncomeFilters) =>
      [...queryKeys.incomes.lists(), filters] as const,
  },
} as const;

// Filter types
export interface ExpenseFilters {
  groupId: string;
  dateRange?: { start: Date; end: Date };
  memberIds?: string[];
}

export interface IncomeFilters {
  groupId: string;
  dateRange?: { start: Date; end: Date };
  memberIds?: string[];
}
```

### Pattern 2: React Query Hook with Dynamic Filters
**What:** Convert useState-based hooks to useQuery with filter parameters in query key
**When to use:** All data fetching hooks that need to respond to filter changes
**Example:**
```typescript
// Source: React Query docs + Supabase patterns
// hooks/useExpenses.tsx (converted)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys, type ExpenseFilters } from './queries/queryKeys';
import type { Expense } from '@/lib/types';

export function useExpenses(filters: ExpenseFilters) {
  const queryClient = useQueryClient();

  // Query for fetching expenses
  const query = useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('group_id', filters.groupId)
        .order('date', { ascending: false });

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('date', filters.dateRange.start.toISOString())
          .lte('date', filters.dateRange.end.toISOString());
      }

      // Apply member filter
      if (filters.memberIds && filters.memberIds.length > 0) {
        query = query.in('paid_by', filters.memberIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Parse splits from JSON string
      return (data || []).map(row => ({
        ...row,
        splits: row.splits ? JSON.parse(row.splits) : null,
      })) as Expense[];
    },
    enabled: !!filters.groupId, // Don't run without groupId
    staleTime: 30 * 1000, // 30 seconds - analytics data doesn't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Mutations would invalidate queryKeys.expenses.lists()
  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
```

### Pattern 3: Currency Integer Storage and Conversion
**What:** Store currency as integers (cents/öre) in database, convert for display only
**When to use:** All currency fields - expenses.amount, incomes.amount, settlements.amount
**Example:**
```typescript
// Source: Modern Treasury blog + currency.js docs
// lib/currency.ts

/**
 * Convert display amount (kr) to storage amount (öre/cents)
 * @param kr - Amount in kronor (e.g., 123.45)
 * @returns Amount in öre as integer (e.g., 12345)
 */
export function toOre(kr: number): number {
  // Multiply first, then round to avoid floating point errors
  return Math.round(kr * 100);
}

/**
 * Convert storage amount (öre) to display amount (kr)
 * @param ore - Amount in öre as integer (e.g., 12345)
 * @returns Amount in kronor (e.g., 123.45)
 */
export function toKronor(ore: number): number {
  return ore / 100;
}

/**
 * Format currency for display
 * @param ore - Amount in öre as integer
 * @returns Formatted string (e.g., "123,45 kr")
 */
export function formatCurrency(ore: number): string {
  return `${toKronor(ore).toLocaleString('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr`;
}

// Migration for expenses table
// Currently: amount stored as NUMERIC(10,2) - decimals
// Target: amount stored as BIGINT - integers in öre
//
// UPDATE public.expenses SET amount = ROUND(amount * 100);
// ALTER TABLE public.expenses ALTER COLUMN amount TYPE BIGINT USING ROUND(amount);
```

### Pattern 4: Dependent Queries with enabled Option
**What:** Use React Query's `enabled` option to prevent queries from running until dependencies are met
**When to use:** Queries that depend on user selection or previous query results (e.g., groupId)
**Example:**
```typescript
// Source: TanStack Query dependent queries docs
function AnalyticsPage() {
  const { household, loading: householdLoading } = useGroups();
  const [searchParams] = useSearchParams();

  // Parse filters from URL (Phase 1)
  const dateRange = searchParams.get('range') || 'this-month';
  const memberIds = searchParams.get('members')?.split(',') || [];
  const { start, end } = getDateRange(dateRange);

  // Expenses query depends on household being loaded
  const { expenses, loading: expensesLoading } = useExpenses({
    groupId: household?.id || '',
    dateRange: { start, end },
    memberIds,
  });

  // Query won't run until household.id is available (enabled: !!filters.groupId)
  // When dateRange or memberIds change in URL, query key changes → automatic refetch

  const loading = householdLoading || expensesLoading;

  // Charts receive filtered data, re-render automatically
  return <TrendChart data={expenses} />;
}
```

### Pattern 5: Automatic Chart Updates via React Query
**What:** Charts receive data from React Query hooks; when query refetches, component re-renders with new data
**When to use:** All chart components consuming filtered data
**Example:**
```typescript
// Source: React Query reactivity patterns
// No changes needed to chart components - they already use props

// components/analytics/TrendChart.tsx
export function TrendChart({ data, selectedMonth }: TrendChartProps) {
  // Component already uses data prop
  // When parent refetches via React Query, this re-renders automatically
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      monthLabel: formatMonth(item.month),
    }));
  }, [data]); // Recomputes when data changes

  return <AreaChart data={formattedData} />;
}

// pages/Analys.tsx (consuming pattern)
function Analys() {
  const filters = useFilterParams(); // From Phase 1
  const { expenses } = useExpenses({
    groupId: household.id,
    dateRange: filters.dateFilter,
    memberIds: filters.members,
  });

  // When filters.dateFilter or filters.members change (via URL):
  // 1. Query key changes
  // 2. React Query refetches with new filters
  // 3. expenses updates
  // 4. TrendChart re-renders with new data

  return <TrendChart data={expenses} selectedMonth={filters.dateFilter.preset} />;
}
```

### Anti-Patterns to Avoid
- **Storing filters in query state:** Don't put filter params in local state; read from URL (Phase 1), pass to React Query hooks. URL is source of truth.
- **Manual refetch on filter change:** Don't call `refetch()` when filters change. React Query automatically refetches when query key changes (which includes filters).
- **Floating-point arithmetic on currency:** Don't do `price * 1.25` in JavaScript. Store as integers, do math on integers, convert to decimal only for display.
- **Fetching without enabled guard:** Don't run queries when required params are undefined. Use `enabled: !!groupId` to prevent wasteful requests.
- **Inconsistent query keys:** Don't manually construct query keys differently across files. Use query key factory for consistency.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache invalidation logic | Custom cache clearing on mutations | React Query's `queryClient.invalidateQueries()` | React Query handles cache staleness, refetching, deduplication; manual cache management leads to stale data bugs |
| Loading state coordination | Multiple useState flags for loading | React Query's `isLoading`, `isFetching`, `isSuccess` | Automatic loading state management; handles race conditions when filters change rapidly |
| Currency arithmetic | Custom decimal math library | Integer arithmetic + conversion functions | Integers use native JS math operators safely; no precision errors; simpler than decimal libraries |
| Filter-based refetching | useEffect watching filter state | Query key with filter dependencies | React Query refetches automatically when key changes; no manual effect dependencies to track |
| Optimistic updates | Manual state updates + rollback on error | React Query's `useMutation` with `onMutate`, `onError`, `onSettled` | Built-in optimistic update pattern with automatic rollback; handles complex scenarios like concurrent mutations |

**Key insight:** React Query is designed specifically for server state management with filters. The query key acts as a cache key AND a dependency tracker. Filters in the query key give you automatic refetching for free, without useEffect dependencies or manual cache invalidation logic.

## Common Pitfalls

### Pitfall 1: Query Key Not Including All Filter Dependencies
**What goes wrong:** Filter changes but query doesn't refetch; cache returns stale data for wrong filters
**Why it happens:** Filter parameter added to function but not included in query key array
**How to avoid:** Use query key factory pattern; treat query key like useEffect dependency array - include ALL variables the fetch function uses
**Warning signs:** Charts show old data after changing filters; cache hit when it should be cache miss

### Pitfall 2: Converting Currency at Wrong Layer
**What goes wrong:** Storing floats in database leads to `0.1 + 0.2 = 0.30000000000000004` errors; rounding errors accumulate over calculations
**Why it happens:** Convenient to store "123.45" as `NUMERIC(10,2)` but JavaScript uses IEEE 754 floats for arithmetic
**How to avoid:** Store as `BIGINT` (integers in öre), do all math as integer operations, convert to decimal only for display
**Warning signs:** Settlement calculations off by 1-2 öre; totals don't sum correctly; `Math.round()` scattered everywhere

### Pitfall 3: Missing enabled Guard on Dependent Queries
**What goes wrong:** Query runs with `undefined` groupId, returns empty results, triggers unnecessary database query
**Why it happens:** Query hook called before household is loaded; no guard to prevent execution
**How to avoid:** Add `enabled: !!filters.groupId` to useQuery options; query waits until groupId is available
**Warning signs:** Console errors about invalid UUID; unnecessary Supabase queries on page load; loading flicker

### Pitfall 4: Not Invalidating Related Queries After Mutation
**What goes wrong:** User adds expense, list doesn't update; old data shown until manual refresh
**Why it happens:** Mutation doesn't tell React Query which queries to refetch
**How to avoid:** In `onSuccess` callback of `useMutation`, call `queryClient.invalidateQueries(queryKeys.expenses.lists())` to refetch all expense lists
**Warning signs:** Stale data after create/update/delete; need to reload page to see changes

### Pitfall 5: Supabase Date Filter Format Mismatch
**What goes wrong:** Date range filter returns no results or wrong results
**Why it happens:** Sending Date object or wrong format to Supabase; PostgreSQL expects ISO 8601 strings
**How to avoid:** Use `.toISOString()` when passing dates to Supabase filters; PostgreSQL handles timezone conversion automatically
**Warning signs:** Empty results for date ranges; off-by-one-day errors; timezone bugs

### Pitfall 6: Query staleTime Too Low Causing Excessive Refetches
**What goes wrong:** Query refetches on every component mount; unnecessary database load; UI flickers
**Why it happens:** Default `staleTime: 0` means data immediately stale; refetches on every window focus, mount
**How to avoid:** Set `staleTime` based on data volatility - analytics data rarely changes, use 30-60 seconds; user profile data use 5+ minutes
**Warning signs:** Network tab shows repeated identical queries; Supabase request count high; page feels slow

### Pitfall 7: Expenses Already Use Decimals, Need Migration
**What goes wrong:** Incomes stored as integers but expenses as decimals; inconsistent currency handling; can't do accurate cross-table calculations
**Why it happens:** Incomes table migrated to integer storage, expenses table not yet migrated (current state of codebase)
**How to avoid:** Run database migration to convert expenses.amount from NUMERIC(10,2) to BIGINT; multiply by 100 in migration script; update all insert/update code to use toOre()
**Warning signs:** Settlement calculations mixing integers and floats; type errors when comparing incomes and expenses; inconsistent toLocaleString usage

## Code Examples

Verified patterns from official sources:

### Query Key Factory Implementation
```typescript
// Source: TkDodo's "Effective React Query Keys" blog post
// hooks/queries/queryKeys.ts

export interface DateRangeFilter {
  start: Date;
  end: Date;
}

export interface ExpenseFilters {
  groupId: string;
  dateRange?: DateRangeFilter;
  memberIds?: string[];
}

export interface IncomeFilters {
  groupId: string;
  dateRange?: DateRangeFilter;
  memberIds?: string[];
}

// Hierarchical query keys: ['domain', 'operation', ...filters]
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters: ExpenseFilters) => {
      // Serialize Date objects to ISO strings for stable cache keys
      const serializedFilters = {
        ...filters,
        dateRange: filters.dateRange
          ? {
              start: filters.dateRange.start.toISOString(),
              end: filters.dateRange.end.toISOString(),
            }
          : undefined,
      };
      return [...queryKeys.expenses.lists(), serializedFilters] as const;
    },
  },
  incomes: {
    all: ['incomes'] as const,
    lists: () => [...queryKeys.incomes.all, 'list'] as const,
    list: (filters: IncomeFilters) => {
      const serializedFilters = {
        ...filters,
        dateRange: filters.dateRange
          ? {
              start: filters.dateRange.start.toISOString(),
              end: filters.dateRange.end.toISOString(),
            }
          : undefined,
      };
      return [...queryKeys.incomes.lists(), serializedFilters] as const;
    },
  },
} as const;

// Usage for cache invalidation:
// - Invalidate ALL expenses: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
// - Invalidate ALL expense lists: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() })
// - Invalidate specific filter combo: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(filters) })
```

### Converted useExpenses with React Query
```typescript
// Source: TanStack Query useQuery docs + Supabase docs
// hooks/useExpenses.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys, type ExpenseFilters } from './queries/queryKeys';
import type { Expense, ExpenseSplit } from '@/lib/types';
import { toOre, toKronor } from '@/lib/currency';

export function useExpenses(filters: ExpenseFilters) {
  const queryClient = useQueryClient();

  // Fetch expenses query
  const query = useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('group_id', filters.groupId)
        .order('date', { ascending: false });

      // Apply date range filter if provided
      if (filters.dateRange) {
        query = query
          .gte('date', filters.dateRange.start.toISOString())
          .lte('date', filters.dateRange.end.toISOString());
      }

      // Apply member filter if provided
      if (filters.memberIds && filters.memberIds.length > 0) {
        query = query.in('paid_by', filters.memberIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Parse splits and convert amount from öre to kr for display
      return (data || []).map(row => ({
        ...row,
        amount: toKronor(row.amount), // Convert from öre (after migration)
        splits: row.splits ? JSON.parse(row.splits) : null,
      })) as Expense[];
    },
    enabled: !!filters.groupId, // Only run when groupId is available
    staleTime: 30 * 1000, // 30 seconds - analytics data doesn't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
  });

  // Add expense mutation
  const addMutation = useMutation({
    mutationFn: async (expense: {
      group_id: string;
      amount: number;
      paid_by: string;
      category: string;
      description: string;
      date: string;
      splits?: ExpenseSplit | null;
      repeat?: string;
    }) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          amount: toOre(expense.amount), // Convert kr to öre before insert
          splits: expense.splits ? JSON.stringify(expense.splits) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all expense list queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
      toast.success('Utgift tillagd!');
    },
    onError: (error) => {
      console.error('Error adding expense:', error);
      toast.error('Kunde inte lägga till utgift');
    },
  });

  // Delete expense mutation (similar pattern)
  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
      toast.success('Utgift borttagen!');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Kunde inte ta bort utgift');
    },
  });

  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addExpense: addMutation.mutateAsync,
    deleteExpense: deleteMutation.mutateAsync,
  };
}
```

### Currency Conversion Utilities
```typescript
// Source: Modern Treasury blog + JavaScript number safety limits
// lib/currency.ts

/**
 * Currency utilities for Päronsplit.
 * All monetary values stored as integers (öre/cents) in database.
 * JavaScript's Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991
 * = 90,071,992,547,409.91 kr (90 trillion kr) - well above realistic amounts
 */

/**
 * Convert display amount (kronor) to storage amount (öre)
 * @param kr - Amount in kronor (e.g., 123.45)
 * @returns Amount in öre as integer (e.g., 12345)
 */
export function toOre(kr: number): number {
  // Multiply by 100 and round to handle floating point imprecision
  // Example: 123.456 * 100 = 12345.6 → round to 12346
  return Math.round(kr * 100);
}

/**
 * Convert storage amount (öre) to display amount (kronor)
 * @param ore - Amount in öre as integer (e.g., 12345)
 * @returns Amount in kronor (e.g., 123.45)
 */
export function toKronor(ore: number): number {
  return ore / 100;
}

/**
 * Format currency for display with Swedish locale
 * @param ore - Amount in öre as integer
 * @returns Formatted string (e.g., "123,45 kr")
 */
export function formatCurrency(ore: number, options?: { showDecimals?: boolean }): string {
  const kr = toKronor(ore);
  const formatted = kr.toLocaleString('sv-SE', {
    minimumFractionDigits: options?.showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} kr`;
}

/**
 * Parse user input string to öre
 * Handles both comma and period as decimal separator
 * @param input - User input (e.g., "123,45" or "123.45")
 * @returns Amount in öre as integer, or null if invalid
 */
export function parseInputToOre(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  const kr = parseFloat(cleaned);
  if (isNaN(kr)) return null;
  return toOre(kr);
}
```

### Database Migration for Integer Currency Storage
```sql
-- Source: Requirement TECH-02 + PostgreSQL docs
-- Migration: Convert expenses.amount from NUMERIC(10,2) to BIGINT

-- Step 1: Convert existing values from kr to öre (multiply by 100)
UPDATE public.expenses SET amount = ROUND(amount * 100);

-- Step 2: Change column type to BIGINT
ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE BIGINT
  USING ROUND(amount);

-- Step 3: Verify incomes table already uses BIGINT
-- (Already migrated according to useIncomes.tsx code - converts with / 100)

-- Step 4: Verify settlements table uses correct type
ALTER TABLE public.settlements
  ALTER COLUMN amount TYPE BIGINT
  USING ROUND(amount * 100);

-- Note: After migration, all currency values stored as integers (öre)
-- Frontend code must use toOre() on insert, toKronor() on read
```

### Integration with Phase 1 URL Filters
```typescript
// Source: Combining Phase 1 + Phase 2 patterns
// pages/Analys.tsx (using filters from URL)

import { useSearchParams } from 'react-router-dom';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { getDateRange } from '@/lib/datePresets'; // Phase 1 utility

export default function Analys() {
  const [searchParams] = useSearchParams();
  const { household } = useGroups();

  // Parse filters from URL (Phase 1)
  const dateRangePreset = searchParams.get('range') || 'this-month';
  const memberIdsParam = searchParams.get('members');
  const memberIds = memberIdsParam ? memberIdsParam.split(',') : [];

  // Convert preset to date range
  const { start, end } = getDateRange(dateRangePreset);

  // Build filter object
  const filters = {
    groupId: household?.id || '',
    dateRange: { start, end },
    memberIds: memberIds.length > 0 ? memberIds : undefined,
  };

  // Fetch data with filters (Phase 2)
  const { expenses, loading: expensesLoading } = useExpenses(filters);
  const { incomes, loading: incomesLoading } = useIncomes(filters);

  // When URL changes (user changes filters in FilterBar from Phase 1):
  // 1. searchParams updates (React Router)
  // 2. filters object changes
  // 3. Query keys change (includes new filters)
  // 4. React Query automatically refetches
  // 5. expenses/incomes update
  // 6. Charts re-render with new data
  //
  // NO manual refetch() calls needed!

  return (
    <div>
      <FilterBar /> {/* Phase 1 component - updates URL */}
      <TrendChart data={expenses} /> {/* Automatically updates */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState + useEffect for data | React Query with query keys | 2020-2022 | Automatic caching, refetching, deduplication; no manual loading state management |
| Manual cache invalidation | queryClient.invalidateQueries() | React Query v3+ (2021) | Declarative cache invalidation by key patterns; no stale data bugs |
| NUMERIC(10,2) for currency | BIGINT (integer cents) | Industry standard 2015+ | Eliminates floating-point errors; safe arithmetic; Stripe, Shopify, Modern Treasury all use this |
| Manual refetch on param change | Query key includes params | React Query v2+ (2020) | Automatic refetching when dependencies change; no useEffect watchers needed |
| Global loading flags | Per-query loading states | React Query v3+ (2021) | Fine-grained loading UI; loading/success/error per query; better UX |

**Deprecated/outdated:**
- `react-query` package name: Renamed to `@tanstack/react-query` in v4 (2022); old package deprecated
- `cacheTime` option: Renamed to `gcTime` in v5 (2024); `cacheTime` still works but deprecated
- Currency.js library: Good for formatting but overkill if storing as integers; native JS math sufficient
- Decimal.js for currency: Heavy library; integer arithmetic simpler and faster

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Migration Timing for Expenses Table**
   - What we know: Expenses currently use NUMERIC(10,2), incomes already use BIGINT; need consistency
   - What's unclear: Whether existing production data exists that would be affected by migration
   - Recommendation: Run migration in Phase 2; test thoroughly with existing data; use `ROUND(amount * 100)` to preserve precision

2. **staleTime Optimization for Different Data Types**
   - What we know: Analytics data rarely changes; user data changes frequently
   - What's unclear: Optimal staleTime values for different query types in this app
   - Recommendation: Start conservative - 30 seconds for expenses/incomes, 5 minutes for user profiles; adjust based on user feedback and monitoring

3. **Real-time Updates vs Polling**
   - What we know: Supabase supports real-time subscriptions; React Query supports polling
   - What's unclear: Whether real-time updates needed for analytics (household members making concurrent edits)
   - Recommendation: Phase 2 uses React Query polling/refetching; evaluate need for real-time in Phase 3+ based on user patterns

4. **Query Persistence Across Sessions**
   - What we know: Project uses `@tanstack/react-query-persist-client` with storage persister (App.tsx)
   - What's unclear: Should filtered queries persist across browser sessions, or only household/user data
   - Recommendation: Persist user/household data; don't persist filtered analytics queries (filters in URL already provide persistence)

5. **Handling Concurrent Mutations**
   - What we know: React Query supports optimistic updates and rollback
   - What's unclear: Whether multiple household members will frequently edit same expense simultaneously
   - Recommendation: Start with simple invalidation (no optimistic updates); add optimistic updates in later phase if concurrent editing becomes common

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 documentation: https://tanstack.com/query/latest/docs/framework/react/overview
- TanStack Query Keys guide: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- TanStack Query Dependent Queries: https://tanstack.com/query/v4/docs/react/guides/dependent-queries
- TkDodo's "Effective React Query Keys" blog: https://tkdodo.eu/blog/effective-react-query-keys
- TkDodo's "Practical React Query" blog: https://tkdodo.eu/blog/practical-react-query
- Supabase JavaScript filtering docs: https://supabase.com/docs/reference/javascript/v1/using-filters
- Supabase Query Optimization: https://supabase.com/docs/guides/database/query-optimization
- Modern Treasury: "Floats Don't Work For Storing Cents": https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents

### Secondary (MEDIUM confidence)
- React Query with Supabase patterns: https://makerkit.dev/blog/saas/supabase-react-query
- Currency handling in JavaScript: https://frontstuff.io/how-to-handle-monetary-values-in-javascript
- Handling Currency in JavaScript (Medium): https://patrickkarsh.medium.com/handling-currency-in-javascript-94ac038c6da3
- Supabase date filtering: https://www.restack.io/docs/supabase-knowledge-supabase-date-filter-guide
- PostgreSQL indexes for dates: https://supabase.com/docs/guides/database/postgres/indexes
- React Query state management 2026: https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns

### Tertiary (LOW confidence)
- GitHub discussions on Supabase + React Query: https://github.com/orgs/supabase/discussions/14620
- Community query key factory: https://github.com/lukemorales/query-key-factory

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (React Query 5.83.0, Supabase 2.90.1); well-documented patterns
- Architecture: HIGH - Query key factory pattern is TanStack Query official recommendation; TkDodo blog is authoritative community resource
- Pitfalls: HIGH - Common issues documented across multiple official sources and community posts; integer currency storage is industry standard (Stripe, Modern Treasury)

**Research date:** 2026-01-28
**Valid until:** 90 days (React Query v5 stable; Supabase API stable; currency patterns timeless)

**Key dependencies verified:**
- @tanstack/react-query: 5.83.0 (from package.json)
- @tanstack/react-query-persist-client: 5.90.18 (from package.json)
- @tanstack/query-sync-storage-persister: 5.90.18 (from package.json)
- @supabase/supabase-js: 2.90.1 (from package.json)
- React Router DOM: 6.30.1 (from package.json)

**Integration points:**
- Existing: useExpenses and useIncomes hooks use useState + manual fetch (needs conversion to React Query)
- Existing: useAllUsers already uses React Query with proper query key (good reference pattern)
- Existing: Incomes table stores amount as integer, divides by 100 on read (needs expense table migration for consistency)
- Existing: Analys.tsx filters by month/year in local state (Phase 1 moves to URL, Phase 2 hooks consume URL filters)
- New: Query key factory for consistent cache keys
- New: Currency conversion utilities (toOre, toKronor, formatCurrency)
- New: Database migration for expenses.amount NUMERIC → BIGINT

**Current state analysis:**
- ✅ React Query already installed and used (useAllUsers.tsx)
- ✅ Supabase client configured with RLS policies
- ✅ Incomes already store as integers (öre) - model for expenses
- ❌ Expenses store as NUMERIC(10,2) - needs migration
- ❌ useExpenses/useIncomes use useState - need React Query conversion
- ❌ Manual refetch() calls - should be automatic via query key changes
- ✅ Charts already use props - will update automatically when data refetches
