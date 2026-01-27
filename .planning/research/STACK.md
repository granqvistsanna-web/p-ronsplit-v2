# Technology Stack - Analytics Cockpit Features

**Project:** Päronsplit Analytics Cockpit
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

The existing stack is well-positioned for analytics cockpit features. Primary additions needed are URL state management patterns and date range preset utilities. **No new libraries required** - leverage existing React Router v6, date-fns, and localStorage patterns already in use.

## Core Stack Additions

### URL State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React Router v6 useSearchParams** | 6.30.1 (installed) | URL query param sync | Already installed, native solution, no dependencies |
| **nuqs** | 2.2.0+ | Type-safe URL state (OPTIONAL) | If type safety needed, has react-router adapter since v2.0 |
| Custom hook wrapper | N/A | Type-safe abstraction | Recommended: wrap useSearchParams with Zod validation |

**Recommendation:** Start with custom hook wrapping React Router's `useSearchParams`. Migrate to nuqs only if URL state complexity increases significantly.

### Date Range Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **date-fns** | 3.6.0 (installed) | Date calculations | Already installed, provides all preset logic |
| **react-day-picker** | 8.10.1 (installed) | Date picker UI | Already installed, shadcn/ui Calendar uses it |

**No new installations required.**

### State Persistence
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **localStorage** | Native | Filter state persistence | Already used for React Query cache |
| **React Query persister** | 5.90.18 (installed) | Query cache persistence | Already configured, proven pattern |

**Leverage existing patterns.**

## Recommended Patterns

### 1. URL State Synchronization Pattern

**Use React Router v6 native approach with custom hook:**

```typescript
// hooks/useAnalyticsFilters.ts
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

const FilterSchema = z.object({
  tab: z.enum(['overview', 'categories', 'members', 'trends', 'budgets']).default('overview'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preset: z.enum(['thisMonth', 'lastMonth', 'last30Days', 'last90Days', 'ytd', 'custom']).optional(),
});

export function useAnalyticsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse and validate params
  const filters = FilterSchema.parse({
    tab: searchParams.get('tab') || 'overview',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    preset: searchParams.get('preset') || undefined,
  });

  // Type-safe setter
  const setFilters = (updates: Partial<z.infer<typeof FilterSchema>>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams, { replace: true }); // Use replace to avoid cluttering history
  };

  return { filters, setFilters };
}
```

**Why this pattern:**
- Works with existing React Router v6.30.1
- Type-safe with Zod validation
- Single source of truth (URL)
- Shareable via copy-paste URL
- No new dependencies

**Alternative if nuqs needed later:**
```typescript
// Install: npm install nuqs
import { useQueryState, parseAsStringEnum, parseAsIsoDate } from 'nuqs';
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v6';

export function useAnalyticsFilters() {
  const [tab, setTab] = useQueryState('tab', parseAsStringEnum(['overview', 'categories', 'members', 'trends', 'budgets']).withDefault('overview'));
  const [startDate, setStartDate] = useQueryState('startDate', parseAsIsoDate);
  const [endDate, setEndDate] = useQueryState('endDate', parseAsIsoDate);
  // ...
}
```

**Decision criteria:** Use nuqs if you need >5 URL params or complex parsing. Otherwise, custom hook is simpler.

### 2. Date Range Presets Pattern

**Use date-fns functions already installed:**

```typescript
// utils/datePresets.ts
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfYear,
  endOfDay,
  format
} from 'date-fns';

export type DatePreset = 'thisMonth' | 'lastMonth' | 'last30Days' | 'last90Days' | 'ytd' | 'allTime' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const DATE_PRESETS: Record<DatePreset, { label: string; getRange: () => DateRange }> = {
  thisMonth: {
    label: 'Denna månad',
    getRange: () => {
      const now = new Date();
      return {
        startDate: startOfMonth(now),
        endDate: endOfDay(now), // Include today
      };
    },
  },
  lastMonth: {
    label: 'Förra månaden',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    },
  },
  last30Days: {
    label: 'Senaste 30 dagarna',
    getRange: () => ({
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    }),
  },
  last90Days: {
    label: 'Senaste 90 dagarna',
    getRange: () => ({
      startDate: subDays(new Date(), 90),
      endDate: new Date(),
    }),
  },
  ytd: {
    label: 'I år',
    getRange: () => ({
      startDate: startOfYear(new Date()),
      endDate: new Date(),
    }),
  },
  allTime: {
    label: 'All tid',
    getRange: () => ({
      startDate: new Date('2020-01-01'), // Adjust based on earliest data
      endDate: new Date(),
    }),
  },
  custom: {
    label: 'Anpassad',
    getRange: () => ({ startDate: new Date(), endDate: new Date() }), // Placeholder
  },
};

// Serialize for URL
export function serializeDateRange(range: DateRange) {
  return {
    startDate: format(range.startDate, 'yyyy-MM-dd'),
    endDate: format(range.endDate, 'yyyy-MM-dd'),
  };
}
```

**Integration with existing MonthSelectionProvider:**

The current `useMonthSelection` context (src/hooks/useMonthSelection.tsx) uses a different pattern (year + month state). For analytics cockpit, **replace with date range approach** to support flexible presets beyond single-month selection.

**Migration strategy:**
1. Keep `MonthSelectionProvider` for existing pages (Index, Analys if they stay month-based)
2. Create new `DateRangeProvider` for analytics cockpit pages
3. Both can coexist during transition

### 3. Date Range Picker Component

**Extend existing shadcn/ui Calendar component:**

```typescript
// components/analytics/DateRangePicker.tsx
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function DateRangePicker({
  value,
  onChange,
  presets
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  presets?: Array<{ label: string; value: DateRange }>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>{format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}</>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>Välj datumintervall</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Preset buttons */}
          {presets && (
            <div className="border-r p-3 space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          {/* Calendar */}
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Why this pattern:**
- Extends existing `Calendar` component (already using react-day-picker)
- Follows shadcn/ui patterns (Popover + Calendar)
- Presets sidebar matches CoreUI/MUI patterns from research
- No new dependencies

### 4. Filter State Persistence Pattern

**Use localStorage with React Query pattern:**

```typescript
// hooks/usePersistedFilters.ts
import { useEffect } from 'react';

const STORAGE_KEY = 'analytics_filters';

export function usePersistedFilters(filters: Record<string, any>) {
  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Apply stored filters (trigger via callback or state setter)
        return parsed;
      } catch (e) {
        console.error('Failed to parse stored filters', e);
      }
    }
  }, []);

  // Save to localStorage when filters change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);
}
```

**Integration with URL state:**

```typescript
// Combine URL state (shareable) + localStorage (persistence)
export function useAnalyticsState() {
  const { filters, setFilters } = useAnalyticsFilters(); // From URL

  // On mount, restore from localStorage if URL is empty
  useEffect(() => {
    if (!filters.preset && !filters.startDate) {
      const stored = localStorage.getItem('analytics_filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters(parsed); // Hydrate URL from localStorage
      }
    }
  }, []);

  // Save to localStorage whenever URL changes
  useEffect(() => {
    localStorage.setItem('analytics_filters', JSON.stringify(filters));
  }, [filters]);

  return { filters, setFilters };
}
```

**Precedence:** URL params > localStorage > defaults

### 5. Supabase Budget Schema Pattern

**New table schema for category budgets:**

```sql
-- budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- Match categories from expenses table
  amount DECIMAL(10, 2) NOT NULL, -- Budget amount in kr
  period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for recurring monthly budgets
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure one budget per category per household per period
  UNIQUE(household_id, category, start_date)
);

-- Index for fast lookups
CREATE INDEX idx_budgets_household_category ON budgets(household_id, category);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- RLS policies (follow existing patterns)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets for their household"
  ON budgets FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert budgets for their household"
  ON budgets FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budgets for their household"
  ON budgets FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets for their household"
  ON budgets FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

**React Query integration:**

```typescript
// hooks/useBudgets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useBudgets(householdId: string | undefined) {
  return useQuery({
    queryKey: ['budgets', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('household_id', householdId)
        .order('category');
      if (error) throw error;
      return data;
    },
    enabled: !!householdId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: { household_id: string; category: string; amount: number; start_date: string }) => {
      const { data, error } = await supabase.from('budgets').insert(budget).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
```

**Budget vs Expense calculation:**

```typescript
// utils/budgetCalculations.ts
export function calculateBudgetStatus(
  budget: { amount: number; category: string; start_date: string; end_date: string | null },
  expenses: Array<{ amount: number; category: string; date: string }>
) {
  const spent = expenses
    .filter(e =>
      e.category === budget.category &&
      e.date >= budget.start_date &&
      (!budget.end_date || e.date <= budget.end_date)
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const remaining = budget.amount - spent;
  const percentUsed = (spent / budget.amount) * 100;

  return {
    budgeted: budget.amount,
    spent,
    remaining,
    percentUsed,
    status: percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : 'ok',
  };
}
```

## Tab Navigation Pattern

**Use shadcn/ui Tabs component (already installed):**

```typescript
// pages/AnalyticsCockpit.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

export default function AnalyticsCockpit() {
  const { filters, setFilters } = useAnalyticsFilters();

  return (
    <Tabs value={filters.tab} onValueChange={(tab) => setFilters({ tab })}>
      <TabsList>
        <TabsTrigger value="overview">Översikt</TabsTrigger>
        <TabsTrigger value="categories">Kategorier</TabsTrigger>
        <TabsTrigger value="members">Medlemmar</TabsTrigger>
        <TabsTrigger value="trends">Trender</TabsTrigger>
        <TabsTrigger value="budgets">Budgetar</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Overview charts */}
      </TabsContent>
      <TabsContent value="categories">
        {/* Category breakdown */}
      </TabsContent>
      {/* ... */}
    </Tabs>
  );
}
```

**Tab state synced to URL automatically via `useAnalyticsFilters`.**

## Installation Commands

**No new packages required.** All dependencies already installed:
- react-router-dom@6.30.1 ✓
- date-fns@3.6.0 ✓
- react-day-picker@8.10.1 ✓
- @tanstack/react-query@5.83.0 ✓
- @radix-ui/react-tabs@1.1.12 ✓
- zod@3.25.76 ✓

**Optional additions (only if needed):**

```bash
# Type-safe URL state (if custom hook becomes unwieldy)
npm install nuqs@^2.2.0

# Only if you need advanced date range features beyond date-fns
# (NOT RECOMMENDED - date-fns is sufficient)
# npm install date-fns-tz
```

## Integration Checklist

- [x] URL state: Use React Router v6 useSearchParams with custom hook
- [x] Date presets: Use date-fns functions (already installed)
- [x] Date picker: Extend existing shadcn/ui Calendar with presets
- [x] Persistence: localStorage pattern (follows React Query persister approach)
- [x] Tab navigation: shadcn/ui Tabs synced to URL
- [x] Budget schema: New Supabase table with RLS policies
- [x] No new charting library (Recharts only) ✓

## Quality Gates Met

- [x] Patterns work with existing React Query setup (localStorage + query invalidation)
- [x] URL state approach compatible with react-router-dom v6 (useSearchParams hook)
- [x] No new charting library (Recharts already installed and used)

## Migration from Current Analys Page

**Current pattern (Analys.tsx):**
- Local state: `useState` for year/month selection
- MonthSelectionProvider context for global month state
- Manual month navigation (prev/next buttons)

**Analytics cockpit pattern:**
- URL state: `useSearchParams` for all filters
- Date range presets: Flexible periods (not just months)
- Deep linkable: Share URLs with specific date ranges

**Coexistence strategy:**
1. Keep existing Analys page as-is (month-based view)
2. Build new analytics cockpit with URL state pattern
3. Eventually migrate Analys page to use same URL state approach
4. Deprecate MonthSelectionProvider when all pages use URL state

## Performance Considerations

**URL state re-renders:**
React Router v6's `useSearchParams` triggers full component re-renders when query params change. Mitigate with:

```typescript
// Memoize expensive calculations
const filteredExpenses = useMemo(() => {
  return expenses.filter(e => /* date range filter */);
}, [expenses, filters.startDate, filters.endDate]);

// Use React.memo for chart components
export const TrendChart = React.memo(({ data, selectedPeriod }) => {
  // Chart rendering
});
```

**localStorage size limits:**
- Typical limit: 5-10MB across all domains
- Filter state is tiny (<1KB), no concerns
- React Query cache already managed by existing persister

## Sources

### URL State Management
- [React Router v6 useSearchParams API Reference](https://reactrouter.com/en/main/hooks/use-search-params) - Official documentation (HIGH confidence)
- [nuqs - Type-safe search params state management](https://nuqs.dev/) - Official library docs with react-router adapter (HIGH confidence)
- [Advanced React state management using URL parameters - LogRocket](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/) - Community patterns (MEDIUM confidence)
- [React Router v6 Type-Safe Search Params RFC](https://github.com/remix-run/react-router/discussions/13713) - Future direction (MEDIUM confidence)

### Date Range Patterns
- [date-fns official documentation](https://date-fns.org/) - Official docs (HIGH confidence)
- [react-day-picker official site](https://daypicker.dev/) - Official docs (HIGH confidence)
- [React Date Picker with Range - shadcn/ui](https://www.shadcn.io/patterns/date-picker-standard-1) - Community pattern (MEDIUM confidence)
- [MUI X Date Range Picker](https://mui.com/x/react-date-pickers/date-range-picker/) - Preset patterns reference (MEDIUM confidence)

### State Persistence
- [Persisting React Query cache in localStorage - New Orbit](https://neworbit.co.uk/blog/post/persisted-react-query-cache/) - Community guide (MEDIUM confidence)
- [TanStack Query persistQueryClient](https://tanstack.com/query/v4/docs/framework/react/plugins/persistQueryClient) - Official docs (HIGH confidence)

### Database Schema
- [Building a Personal Finance Management App - Medium](https://medium.com/towards-data-engineering/building-a-personal-finance-management-app-database-setup-with-postgresql-and-docker-5075e283303e) - Schema patterns (MEDIUM confidence)
- [Designing a database schema for a budget tracker](https://bogoyavlensky.com/blog/db-schema-for-budget-tracker-with-automigrate/) - Community example (MEDIUM confidence)
- [Supabase Tables and Data](https://supabase.com/docs/guides/database/tables) - Official docs (HIGH confidence)

### Analytics Dashboard Patterns
- [MERN Fullstack Expense Tracker](https://github.com/topics/expense-tracker?l=javascript&o=desc&s=updated) - GitHub examples (LOW confidence, reference only)
- [Best React Dashboards in 2026](https://www.untitledui.com/blog/react-dashboards) - Component patterns (MEDIUM confidence)
