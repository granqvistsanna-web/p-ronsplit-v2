# Architecture: Analytics Dashboard Enhancement

**Project:** Päronsplit Analytics Enhancement
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

This architecture document outlines how filter state, drill-down panels, and budget data should integrate with the existing React/Supabase architecture. The recommendations follow established patterns already present in the codebase while introducing URL-based filter state management for shareability and persistence.

## Current Architecture Analysis

### Existing Patterns (Verified from Codebase)

**State Management:**
- Context-based global state: `AuthProvider`, `MonthSelectionProvider`, `ThemeProvider`
- Custom hooks for data fetching: `useExpenses`, `useIncomes`, `useGroups`, `useSettlements`
- Hook pattern returns: `{ data, loading, addX, updateX, deleteX, refetch }`

**Data Layer:**
- Supabase client: Direct imports from `@/integrations/supabase/client`
- No React Query in data hooks (despite being installed)
- Real-time refetch pattern: Call `refetch()` after mutations
- Optimistic updates: Not used (simple refetch pattern)

**UI Components:**
- shadcn/ui + Radix UI primitives (sheet, drawer, dialog available)
- Vaul library installed (v0.9.9) for drawer functionality
- Mobile-responsive: `useSidebar` hook for layout adjustments
- Touch-optimized: `[touch-action:manipulation]` class pattern in Analys.tsx

**Current Filter State (Analys.tsx):**
```typescript
const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
```
- Local component state (not URL-synced)
- Keyboard navigation: Cmd+Arrow for month/year
- No deep linking capability currently

## Recommended Architecture

### 1. Filter State Management

**Approach: Hybrid URL + Context Pattern**

Use React Router's `useSearchParams` as the source of truth for shareable filter state, with a custom context wrapper for convenient access across components.

**Why Hybrid:**
- URL provides persistence, shareability, browser history
- Context prevents prop drilling and provides convenient API
- Follows "URL as source of truth" best practice ([LogRocket](https://blog.logrocket.com/url-state-usesearchparams/))
- Maintains consistency with existing context pattern (MonthSelectionProvider)

**Implementation Strategy:**

```typescript
// src/hooks/useAnalyticsFilters.tsx
import { useSearchParams } from 'react-router-dom';
import { createContext, useContext, useMemo } from 'react';

interface AnalyticsFilters {
  datePreset: 'this-month' | 'last-month' | 'last-30-days' | 'ytd' | 'last-3-months' | 'last-6-months' | 'last-12-months';
  startDate: string | null;
  endDate: string | null;
  memberIds: string[];  // empty = all members
  categoryFilter: string[];  // empty = all categories
}

interface AnalyticsFiltersContext extends AnalyticsFilters {
  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  resetFilters: () => void;
  isDefaultState: boolean;
}

// Context wraps useSearchParams and provides typed interface
export function AnalyticsFiltersProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: AnalyticsFilters = useMemo(() => ({
    datePreset: searchParams.get('period') as any || 'this-month',
    startDate: searchParams.get('start'),
    endDate: searchParams.get('end'),
    memberIds: searchParams.get('members')?.split(',').filter(Boolean) || [],
    categoryFilter: searchParams.get('categories')?.split(',').filter(Boolean) || []
  }), [searchParams]);

  const setFilters = useCallback((updates: Partial<AnalyticsFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // Update logic with proper encoding
      if (updates.datePreset) next.set('period', updates.datePreset);
      if (updates.memberIds) next.set('members', updates.memberIds.join(','));
      // ... etc
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams({}); // Clear all params
  }, [setSearchParams]);

  const isDefaultState = useMemo(() => {
    return filters.datePreset === 'this-month' &&
           filters.memberIds.length === 0 &&
           filters.categoryFilter.length === 0;
  }, [filters]);

  return (
    <AnalyticsFiltersContext.Provider value={{ ...filters, setFilters, resetFilters, isDefaultState }}>
      {children}
    </AnalyticsFiltersContext.Provider>
  );
}

export const useAnalyticsFilters = () => {
  const context = useContext(AnalyticsFiltersContext);
  if (!context) throw new Error('useAnalyticsFilters must be within provider');
  return context;
};
```

**URL Parameter Schema:**
- `?period=this-month` - Date range preset
- `?start=2026-01-01&end=2026-01-31` - Custom range (if preset = custom)
- `?members=uuid1,uuid2` - Selected member filter (comma-separated)
- `?categories=Mat,Transport` - Category filter (comma-separated, URL-encoded)

**Benefits:**
- Shareable URLs: Copy/paste filtered view to colleagues
- Browser history: Back/forward maintains filter state
- Refresh-persistent: Filters survive page reload
- localStorage sync: Store last-used preset per user for default
- Deep linking: Email/Slack links land on exact view

**Limitations:**
- URL length: Keep filter lists reasonable (browsers limit ~2000 chars)
- Sensitive data: Don't put private info in URL (member names OK, amounts not OK)
- High-frequency updates: Debounce rapid filter changes to avoid history spam

### 2. Data Fetching with Filters

**Pattern: Filter at Hook Level**

Extend existing hooks to accept filter parameters while maintaining the established pattern:

```typescript
// Extend useExpenses to accept date range
export function useExpenses(groupId?: string, filters?: { startDate?: string; endDate?: string; memberIds?: string[] }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from("expenses").select("*");

      if (groupId) query = query.eq("group_id", groupId);
      if (filters?.startDate) query = query.gte("date", filters.startDate);
      if (filters?.endDate) query = query.lte("date", filters.endDate);
      if (filters?.memberIds?.length) query = query.in("paid_by", filters.memberIds);

      const { data, error } = await query.order("date", { ascending: false });
      if (error) throw error;

      // ... existing normalization logic
      setExpenses(normalized);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Kunde inte hämta utgifter");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, filters?.startDate, filters?.endDate, filters?.memberIds]);

  // ... rest of hook unchanged
  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
}
```

**Why Not React Query Here:**
- Existing hooks don't use React Query despite it being installed
- Changing pattern would require refactoring all hooks
- Current pattern is simple and works well for this app size
- React Query adds complexity without clear benefit for 2-user household app

**Alternative (if React Query adoption is desired):**
```typescript
// If migrating to React Query pattern
export function useExpenses(groupId?: string, filters?: FilterParams) {
  return useQuery({
    queryKey: ['expenses', groupId, filters],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*");
      // ... apply filters
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}
```

**Recommendation:** Stick with existing custom hook pattern for consistency. Consider React Query migration as separate future refactor if needed.

### 3. Drill-Down Panel Architecture

**Pattern: Adaptive Panel Component (Desktop Side Panel, Mobile Bottom Sheet)**

**Component: `DrillDownPanel`**

Use Radix UI Dialog primitives with responsive behavior:

```typescript
// src/components/analytics/DrillDownPanel.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMobile } from "@/hooks/use-mobile";

interface DrillDownPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  expenses: Expense[];
  budget?: Budget;
}

export function DrillDownPanel({ open, onOpenChange, category, expenses, budget }: DrillDownPanelProps) {
  const isMobile = useMobile();

  const content = (
    <>
      {/* Shared content for both mobile and desktop */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{category}</h3>
          {budget && <BudgetProgress budget={budget} actual={calculateTotal(expenses)} />}
        </div>
        <TransactionList expenses={expenses} />
      </div>
    </>
  );

  if (isMobile) {
    // Bottom sheet on mobile (uses Vaul under the hood)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{category}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto max-h-[70vh]">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Side panel on desktop (uses Radix Dialog)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{category}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 overflow-y-auto">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Why This Pattern:**
- Uses existing shadcn/ui Sheet + Vaul Drawer components (already installed)
- Follows mobile-first responsive pattern established in codebase
- `use-mobile` hook already exists for breakpoint detection
- Maintains accessibility: Radix primitives handle focus trap, escape key, ARIA
- No new dependencies required

**State Management for Panel:**
```typescript
// In Analys.tsx or parent component
const [drillDownState, setDrillDownState] = useState<{
  open: boolean;
  category: string | null;
  expenses: Expense[];
}>({ open: false, category: null, expenses: [] });

const openDrillDown = (category: string, expenses: Expense[]) => {
  setDrillDownState({ open: true, category, expenses });
};

const closeDrillDown = () => {
  setDrillDownState({ open: false, category: null, expenses: [] });
};
```

**Optional: URL Sync for Drill-Down**
```typescript
// Sync drill-down state to URL for deep linking
const searchParams = useSearchParams();
const selectedCategory = searchParams.get('drill');

useEffect(() => {
  if (selectedCategory) {
    const categoryData = expensesByCategory.find(c => c.category === selectedCategory);
    if (categoryData) openDrillDown(selectedCategory, categoryData.expenses);
  }
}, [selectedCategory]);

// When opening drill-down
const openDrillDown = (category: string, expenses: Expense[]) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.set('drill', category);
    return next;
  });
  setDrillDownState({ open: true, category, expenses });
};
```

**Best Practice Notes:**
- Bottom sheets for mobile: Follow Material Design guidelines ([Material Design](https://m1.material.io/components/bottom-sheets.html))
- Touch targets: 44px minimum (already followed in Analys.tsx filter buttons)
- Swipe to dismiss: Vaul Drawer handles this automatically
- Backdrop: Dim main content when panel/sheet is open
- Focus management: Trap focus in panel, return to trigger on close

### 4. Budget Data Architecture

**Supabase Schema: `budgets` Table**

```sql
-- budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),  -- Budget amount in kr
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, category, period)  -- One budget per category per period per group
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read budgets for groups they belong to
CREATE POLICY "Users can read budgets for their groups"
ON public.budgets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = budgets.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Users can insert budgets for groups they belong to
CREATE POLICY "Users can insert budgets for their groups"
ON public.budgets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = budgets.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Users can update budgets for groups they belong to
CREATE POLICY "Users can update budgets for their groups"
ON public.budgets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = budgets.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Users can delete budgets for groups they belong to
CREATE POLICY "Users can delete budgets for their groups"
ON public.budgets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = budgets.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX idx_budgets_group_id ON public.budgets(group_id);
CREATE INDEX idx_budgets_category ON public.budgets(category);
```

**TypeScript Types:**

```typescript
// src/hooks/useBudgets.tsx
export interface Budget {
  id: string;
  group_id: string;
  category: string;
  amount: number;  // Budget amount in kr
  period: 'monthly' | 'quarterly' | 'yearly';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetInput {
  group_id: string;
  category: string;
  amount: number;
  period?: 'monthly' | 'quarterly' | 'yearly';
  enabled?: boolean;
}
```

**Custom Hook: `useBudgets`**

Follow existing pattern from useExpenses/useIncomes:

```typescript
// src/hooks/useBudgets.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useBudgets(groupId?: string) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    if (!user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from("budgets").select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query.order("category", { ascending: true });

      if (error) throw error;

      setBudgets(data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Kunde inte hämta budgetar");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const addBudget = async (budget: BudgetInput) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          group_id: budget.group_id,
          category: budget.category,
          amount: budget.amount,
          period: budget.period || 'monthly',
          enabled: budget.enabled ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();
      toast.success("Budget tillagd!");
      return data;
    } catch (error) {
      console.error("Error adding budget:", error);
      toast.error("Kunde inte lägga till budget");
      return null;
    }
  };

  const updateBudget = async (
    budgetId: string,
    updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>
  ) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    try {
      const { error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", budgetId);

      if (error) throw error;

      await fetchBudgets();
      toast.success("Budget uppdaterad!");
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Kunde inte uppdatera budget");
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;

      await fetchBudgets();
      toast.success("Budget borttagen!");
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Kunde inte ta bort budget");
    }
  };

  // Helper: Get budget for specific category
  const getBudgetForCategory = useCallback((category: string) => {
    return budgets.find(b => b.category === category && b.enabled);
  }, [budgets]);

  // Helper: Calculate average from last N months
  const calculateLastNMonthsAverage = useCallback(async (
    category: string,
    months: number = 3
  ): Promise<number> => {
    if (!groupId) return 0;

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .eq("group_id", groupId)
        .eq("category", category)
        .gte("date", startDate.toISOString());

      if (error) throw error;

      const total = (data || []).reduce((sum, e) => sum + e.amount, 0);
      return Math.round(total / months);
    } catch (error) {
      console.error("Error calculating average:", error);
      return 0;
    }
  }, [groupId]);

  return {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudgetForCategory,
    calculateLastNMonthsAverage,
    refetch: fetchBudgets,
  };
}
```

**Budget Display Component:**

```typescript
// src/components/analytics/BudgetProgress.tsx
import { Progress } from "@/components/ui/progress";

interface BudgetProgressProps {
  budget: Budget;
  actual: number;
  period?: 'current' | 'full';  // current = pacing, full = full period
}

export function BudgetProgress({ budget, actual, period = 'full' }: BudgetProgressProps) {
  const percentage = (actual / budget.amount) * 100;

  const status = percentage >= 100 ? 'error' : percentage >= 80 ? 'warning' : 'neutral';
  const statusColors = {
    neutral: 'bg-income',
    warning: 'bg-amber-500',
    error: 'bg-icon-pink'
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Budget</span>
        <span className={`font-medium ${
          status === 'error' ? 'text-icon-pink' :
          status === 'warning' ? 'text-amber-500' :
          'text-income'
        }`}>
          {actual.toLocaleString('sv-SE')} kr / {budget.amount.toLocaleString('sv-SE')} kr
        </span>
      </div>
      <Progress value={Math.min(percentage, 100)} className={statusColors[status]} />
      <p className="text-xs text-muted-foreground">
        {percentage >= 100
          ? `${(percentage - 100).toFixed(0)}% över budget`
          : `${(100 - percentage).toFixed(0)}% kvar`
        }
      </p>
    </div>
  );
}
```

**RLS Policy Considerations:**

1. **Group-based access**: Budgets are group-scoped, matching existing expenses/incomes pattern
2. **Member equality**: All group members can CRUD budgets (no creator ownership like expenses)
3. **Cascade delete**: When group is deleted, budgets are automatically cleaned up
4. **No public access**: Budgets are private to group members only
5. **Audit trail**: `created_at` and `updated_at` timestamps for debugging

**Why This Schema:**
- Simple, flat structure (no over-normalization)
- Follows existing pattern from expenses/incomes tables
- RLS policies match group_members pattern
- Category string matches expenses.category (no FK needed for flexibility)
- Unique constraint prevents duplicate budgets per category
- Period column allows future expansion (quarterly/yearly budgets)

## Component Boundaries & Data Flow

### High-Level Component Tree

```
App
├── AuthProvider (context)
├── ThemeProvider (context)
├── MonthSelectionProvider (context) ← REPLACE with AnalyticsFiltersProvider
└── Routes
    └── /analys
        └── AnalysPage
            ├── FilterBar ← New component
            │   ├── DatePresetSelector
            │   ├── MemberFilter
            │   └── CategoryFilter
            ├── KPICards (existing)
            ├── TrendChart (existing)
            ├── ComparisonBar (existing)
            ├── CategoryBreakdown ← Enhanced
            │   ├── CategoryBarChart ← New
            │   ├── CategoryDonut (existing)
            │   └── CategoryLegend (existing)
            ├── BudgetSection ← New
            │   ├── BudgetSetupDialog
            │   └── BudgetProgressList
            └── DrillDownPanel ← New
                ├── TransactionList
                └── BudgetProgress
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        URL Query Params                      │
│  ?period=this-month&members=uuid1&categories=Mat,Transport  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ useSearchParams()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            AnalyticsFiltersProvider (Context)                │
│  - Parses URL params                                         │
│  - Provides typed interface                                  │
│  - Handles setFilters/resetFilters                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ useAnalyticsFilters()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        AnalysPage                            │
│  const { datePreset, memberIds, categoryFilter } = useAnalyticsFilters() │
│  const { household } = useGroups()                           │
│  const { expenses } = useExpenses(household?.id, { startDate, endDate, memberIds }) │
│  const { incomes } = useIncomes(household?.id, { startDate, endDate }) │
│  const { budgets } = useBudgets(household?.id)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Props drilling (filter data already fetched)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Child Components                           │
│  - FilterBar: Updates filters via setFilters()              │
│  - KPICards: Receives filtered expenses/incomes             │
│  - Charts: Receives filtered data                           │
│  - DrillDownPanel: Receives filtered expenses + budget      │
└─────────────────────────────────────────────────────────────┘
```

### Communication Patterns

| From | To | Method | Purpose |
|------|-----|--------|---------|
| FilterBar | AnalyticsFiltersProvider | `setFilters()` | Update URL params |
| AnalysPage | Data hooks | Filter params in args | Fetch filtered data |
| CategoryBreakdown | DrillDownPanel | State + props | Open drill-down with category data |
| DrillDownPanel | useBudgets hook | `getBudgetForCategory()` | Display budget for category |
| BudgetSetupDialog | useBudgets hook | `addBudget()` | Create new budget |
| BudgetSetupDialog | useExpenses hook | `calculateAverage()` helper | Suggest budget from history |

**Key Principles:**
1. **URL is source of truth** for filter state
2. **Context provides convenience** (no prop drilling)
3. **Hooks handle data fetching** with filter params
4. **Local state for UI** (drill-down open/closed, expanded categories)
5. **Props for static data** (filtered results, budgets)

## Build Order Recommendation

Based on dependencies and risk, here's the suggested phase structure:

### Phase 1: Filter Foundation (Highest Priority)
**Goal:** Establish filter state management that all other features depend on

1. Create `AnalyticsFiltersProvider` with URL sync
2. Add to App.tsx providers
3. Create `FilterBar` component with date presets
4. Update Analys.tsx to consume filter context
5. Add "Reset" button that appears when filters are non-default

**Why First:** All other features (drill-down, budgets, charts) need filtering to work properly.

**Deliverable:** Users can filter analytics by date range and see URL update.

### Phase 2: Enhanced Data Fetching
**Goal:** Make existing hooks filter-aware

1. Extend `useExpenses` to accept filter params (startDate, endDate, memberIds)
2. Extend `useIncomes` to accept filter params
3. Add member filter UI to FilterBar
4. Add category filter UI to FilterBar
5. Update Analys.tsx calculations to use filtered data

**Why Second:** Builds on Phase 1, required for drill-down and budgets.

**Deliverable:** All analytics reflect selected filters.

### Phase 3: Drill-Down Panel
**Goal:** Add detailed transaction view with responsive design

1. Create `DrillDownPanel` component (Sheet + Drawer)
2. Add click handlers to category charts
3. Create `TransactionList` component for drill-down content
4. Add URL sync for drill-down state (optional but nice)
5. Test mobile/desktop responsive behavior

**Why Third:** Independent of budgets, good user value early.

**Deliverable:** Click category to see transaction details in side panel (desktop) or bottom sheet (mobile).

### Phase 4: Budget Schema & Hook
**Goal:** Database layer for budgets

1. Create Supabase migration for `budgets` table
2. Add RLS policies
3. Update types.ts with Budget types
4. Create `useBudgets` hook following existing pattern
5. Test CRUD operations in Supabase dashboard

**Why Fourth:** Backend work before UI, needed for Phase 5.

**Deliverable:** Budget data can be created/read/updated/deleted via API.

### Phase 5: Budget UI
**Goal:** User interface for budget management

1. Create `BudgetSetupDialog` component
2. Add "Use last 3 months average" suggestion
3. Create `BudgetProgressList` component
4. Add budget progress bars to category breakdown
5. Integrate budget data into `DrillDownPanel`
6. Add budget status colors (neutral/warning/error)

**Why Fifth:** Depends on Phase 4 schema and Phase 2 filtered data.

**Deliverable:** Users can set budgets per category and see progress.

### Phase 6: Advanced Features (Polish)
**Goal:** Nice-to-have enhancements

1. Add "Other" bucket for small categories in donut chart
2. Add stacked mode toggle for category charts (per member)
3. Add comparison toggle for previous period overlay
4. Add pacing insight ("on track" vs "over pace")
5. Add localStorage persistence for last filter state

**Why Last:** Polish and enhancements, not blocking core functionality.

**Deliverable:** Refined UX with advanced analytics features.

## Quality Gates

Before considering architecture complete, verify:

### Pattern Consistency
- [ ] Filter state uses URL as source of truth (not just useState)
- [ ] Budget hook follows same pattern as useExpenses (returns, naming)
- [ ] Drill-down panel uses existing shadcn/ui Sheet + Vaul Drawer
- [ ] RLS policies follow group_members access pattern
- [ ] Toast messages in Swedish, consistent with existing UI

### Performance
- [ ] Filter changes are debounced (don't spam URL history)
- [ ] Large expense lists are paginated in drill-down panel
- [ ] Budget calculations are memoized (useMemo)
- [ ] Supabase queries use proper indexes (idx_budgets_group_id)

### Accessibility
- [ ] Drill-down panel is keyboard accessible (Escape to close)
- [ ] Filter buttons have 44px touch targets (mobile)
- [ ] Budget status uses color + text (not color alone)
- [ ] Focus is trapped in panel when open
- [ ] Screen reader announcements for filter changes

### Deep Linking
- [ ] Shareable URL contains all filter state
- [ ] Refresh preserves filter state
- [ ] Invalid URL params fall back to defaults gracefully
- [ ] Browser back/forward navigates filter history

### Budget Schema
- [ ] RLS policies tested (users can't access other groups' budgets)
- [ ] Unique constraint prevents duplicate budgets per category
- [ ] Cascade delete works (delete group → budgets removed)
- [ ] updated_at trigger fires on budget updates
- [ ] Amount validation (positive numbers only)

## Pitfalls & Mitigation

### Pitfall 1: URL State Sync Race Conditions
**What goes wrong:** Multiple rapid filter changes cause stale URL state or lost updates.

**Why it happens:** setSearchParams doesn't queue like setState. Multiple calls in same tick override each other.

**Prevention:**
- Use functional update pattern: `setSearchParams(prev => { ... })`
- Debounce rapid filter changes (e.g., member multi-select)
- Batch related updates into single setSearchParams call

**Example:**
```typescript
// BAD: Multiple calls lose updates
setSearchParams({ period: 'last-month' });
setSearchParams({ members: 'uuid1,uuid2' }); // Overwrites period!

// GOOD: Functional update preserves all params
setSearchParams(prev => {
  const next = new URLSearchParams(prev);
  next.set('period', 'last-month');
  next.set('members', 'uuid1,uuid2');
  return next;
});
```

**Source:** [React Router useSearchParams](https://blog.logrocket.com/url-state-usesearchparams/)

### Pitfall 2: Budget Category Name Drift
**What goes wrong:** User changes expense category name, budget no longer matches.

**Why it happens:** Category is TEXT field, not FK. Renames break the link.

**Prevention:**
- Display warning in UI: "Changing category name will affect budget tracking"
- Provide "Rename category" action that updates both expenses and budgets atomically
- Use category select from existing categories (not free text) for budgets

**Alternative approach:**
- Add `category_id` FK to categories table (more complexity)
- Current schema trades flexibility for simplicity (acceptable for 2-user app)

### Pitfall 3: Mobile Bottom Sheet Scroll Lock
**What goes wrong:** Opening bottom sheet on mobile prevents body scroll, users feel trapped.

**Why it happens:** Drawer libraries often add `overflow: hidden` to body.

**Prevention:**
- Vaul Drawer handles this automatically (already installed)
- Ensure max-height on drawer content: `max-h-[70vh]`
- Add internal scroll container with `overflow-y-auto`

**Example:**
```typescript
<DrawerContent>
  <DrawerHeader>...</DrawerHeader>
  <div className="px-4 pb-8 overflow-y-auto max-h-[70vh]">
    {content} {/* Scrolls internally, body stays locked */}
  </div>
</DrawerContent>
```

**Source:** [Vaul Drawer patterns](https://github.com/Temzasse/react-modal-sheet)

### Pitfall 4: Budget Progress Rounding Errors
**What goes wrong:** Budget shows 99% when actual should be 100%, or vice versa.

**Why it happens:** Floating point math + display rounding don't match database values.

**Prevention:**
- Store amounts as NUMERIC in database (not FLOAT)
- Use integer arithmetic where possible (amounts in öre if needed)
- Round consistently: `Math.round(percentage * 100) / 100`

**Example:**
```typescript
// BAD: Floating point error
const percentage = (1234.56 / 1234.55) * 100; // 100.00081...

// GOOD: Round at display time only
const percentage = Math.round((actual / budget) * 100); // 100
```

### Pitfall 5: Filter State Memory Leak
**What goes wrong:** Navigating away from /analys doesn't clean up filter context, causes memory leak.

**Why it happens:** Context provider lives above route level, never unmounts.

**Prevention:**
- Mount `AnalyticsFiltersProvider` inside `/analys` route only (not in App.tsx)
- Or use URL params directly without context (simpler but more prop drilling)

**Recommended structure:**
```typescript
// App.tsx - NO AnalyticsFiltersProvider here
<Routes>
  <Route path="/analys" element={
    <AnalyticsFiltersProvider> {/* Scoped to route */}
      <AnalysPage />
    </AnalyticsFiltersProvider>
  } />
</Routes>
```

**Alternative:** Just use useSearchParams directly in components (no context). Context is a convenience, not required.

## Technology Decisions

| Component | Technology | Why | Alternatives Considered |
|-----------|-----------|-----|------------------------|
| Filter State | React Router useSearchParams | Built-in, no deps, follows best practices | nuqs (overkill for this scope), Zustand (adds complexity) |
| Filter Context | React Context | Matches existing pattern (MonthSelectionProvider) | Props drilling (verbose), Redux (overkill) |
| Drill-Down (Desktop) | Radix UI Sheet (shadcn/ui) | Already installed, accessible, matches existing UI | Custom modal (reinventing wheel) |
| Drill-Down (Mobile) | Vaul Drawer | Already installed (v0.9.9), best-in-class UX | react-modal-sheet (another dep) |
| Budget Storage | Supabase PostgreSQL | Matches existing backend, RLS for security | localStorage (no sync), Firestore (new stack) |
| Budget Hook | Custom hook pattern | Consistency with useExpenses/useIncomes | React Query (not used elsewhere) |
| Date Range Presets | Hardcoded enum | Simple, no library needed | date-fns ranges (overkill), custom logic (error-prone) |

## Sources

**URL State Management:**
- [Why URL state matters: useSearchParams in React - LogRocket](https://blog.logrocket.com/url-state-usesearchparams/)
- [Advanced React state management using URL parameters - LogRocket](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)
- [Storing state in the URL with React - Pierre Hedkvist](https://www.pierrehedkvist.com/posts/react-state-url)
- [Using React Router searchParams to manage filter state - Medium](https://cgarethc.medium.com/using-react-router-searchparams-to-manage-filter-state-for-a-list-e515e8e50166)
- [React Router useSearchParams API Reference](https://reactrouter.com/api/hooks/useSearchParams)

**Drill-Down Panel Patterns:**
- [React Bottom-Sliding Sheet - shadcn/ui](https://www.shadcn.io/patterns/sheet-standard-1)
- [react-modal-sheet GitHub](https://github.com/Temzasse/react-modal-sheet)
- [React Nested Bottom Drawers - shadcn/ui](https://www.shadcn.io/patterns/drawer-bottom-5)
- [Bottom Sheet UI Design Best Practices - Mobbin](https://mobbin.com/glossary/bottom-sheet)
- [Bottom sheets - Material Design](https://m1.material.io/components/bottom-sheets.html)

**Verified from Codebase:**
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/hooks/useExpenses.tsx`
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/hooks/useMonthSelection.tsx`
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/hooks/useAuth.tsx`
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/package.json` (dependencies)
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/pages/Analys.tsx`
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/App.tsx`
- `/Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/integrations/supabase/types.ts`
