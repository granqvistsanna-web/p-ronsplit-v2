# Architecture Patterns: Analytics Cockpit Integration

**Project:** Päronsplit Analytics Cockpit
**Context:** Adding multi-tab analytics to existing React 18 + Supabase app
**Researched:** 2026-01-27

## Executive Summary

Adding a tabbed analytics cockpit to an existing single-page analytics implementation requires careful attention to state management, component boundaries, and progressive enhancement. The existing architecture uses React Query for data fetching with offline persistence, custom hooks for domain logic, and Recharts for visualization.

**Key architectural decision:** Refactor from monolithic 700-line page to composable tab-based system while preserving existing data fetching patterns and adding shared filter state.

## Current Architecture Analysis

### Existing Structure

```
Current State (Analys.tsx - 700 lines):
├── Filter state (useState: selectedYear, selectedMonth)
├── Data hooks (useExpenses, useIncomes, useGroups)
├── Computed data (useMemo: filteredData, totals, monthlyTrend)
├── Chart components (TrendChart, CategoryDonut, ComparisonBar)
└── Inline category list with expand/collapse

Tech Stack:
├── React Query (TanStack Query v5.83.0) - Server state
├── Supabase (@supabase/supabase-js v2.90.1) - Database
├── React Router DOM (v6.30.1) - Routing
├── Radix UI (@radix-ui/react-tabs v1.1.12) - UI primitives
├── Vaul (v0.9.9) - Drawer/bottom sheet (via shadcn/ui)
├── Recharts (v2.15.4) - Charts
└── localStorage - Group selection persistence
```

### Current Patterns

**Data Fetching:**
- Custom hooks (`useExpenses`, `useIncomes`, `useGroups`) wrap Supabase calls
- Hooks use internal `useState` + `useEffect` pattern (not React Query directly)
- React Query is used via `@tanstack/react-query-persist-client` for offline persistence

**State Management:**
- Local component state (`useState`) for filters
- localStorage for selected group persistence
- No URL state synchronization currently
- Computed data in `useMemo` hooks

**Component Patterns:**
- Monolithic page component (700 lines)
- Separate chart components receive formatted data as props
- No drill-down interactions yet

## Recommended Architecture for Analytics Cockpit

### Component Hierarchy

```
AnalyticsCockpit/
├── index.tsx (Main orchestrator - 150 lines max)
│   ├── Manages tab routing + URL state
│   ├── Renders shared FilterBar
│   └── Renders active tab content
│
├── components/
│   ├── FilterBar.tsx (Shared across tabs)
│   │   ├── Date range picker
│   │   ├── Member filter (multi-select)
│   │   ├── Category filter (multi-select)
│   │   └── Syncs to URL + localStorage
│   │
│   ├── tabs/
│   │   ├── OverviewTab.tsx (Current Analys.tsx refactored)
│   │   ├── CategoriesTab.tsx (Category drill-down)
│   │   ├── MembersTab.tsx (Member spending analysis)
│   │   ├── TrendsTab.tsx (Time series focus)
│   │   └── BudgetsTab.tsx (Budget tracking - NEW)
│   │
│   └── drilldown/
│       ├── DrillDownPanel.tsx (Responsive wrapper)
│       │   ├── Desktop: Side panel (react-resizable-panels)
│       │   └── Mobile: Bottom sheet (Drawer from vaul)
│       │
│       ├── CategoryDetail.tsx (Category breakdown)
│       ├── MemberDetail.tsx (Member spending detail)
│       └── BudgetDetail.tsx (Budget progress)
│
├── hooks/
│   ├── useAnalyticsFilters.ts (Shared filter state)
│   ├── useBudgets.ts (Budget CRUD - NEW)
│   └── useAnalyticsData.ts (Computed analytics data)
│
└── types/
    └── analytics.ts (Shared types)
```

### State Management Strategy

#### 1. Filter State (Three-Layer Sync)

**Pattern:** URL (source of truth) → localStorage (persistence) → React state (UI)

```typescript
// useAnalyticsFilters.ts
interface AnalyticsFilters {
  dateRange: { start: string; end: string } | 'month' | 'quarter' | 'year';
  selectedYear: number;
  selectedMonth: number;
  categoryIds: string[];
  memberIds: string[];
}

// Three-layer sync pattern
function useAnalyticsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Initialize from URL or localStorage fallback
  const filters = useMemo(() => ({
    dateRange: searchParams.get('range') || localStorage.getItem('analytics_range') || 'month',
    selectedYear: Number(searchParams.get('year')) || new Date().getFullYear(),
    selectedMonth: Number(searchParams.get('month')) || new Date().getMonth() + 1,
    categoryIds: searchParams.get('categories')?.split(',') || [],
    memberIds: searchParams.get('members')?.split(',') || [],
  }), [searchParams]);

  // 2. Update URL + localStorage atomically
  const setFilters = useCallback((updates: Partial<AnalyticsFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // Update URL params
      Object.entries(updates).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          next.set(key, value.join(','));
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    });

    // Sync to localStorage (debounced)
    Object.entries(updates).forEach(([key, value]) => {
      localStorage.setItem(`analytics_${key}`, JSON.stringify(value));
    });
  }, [setSearchParams]);

  return { filters, setFilters };
}
```

**Why this pattern:**
- URL state enables shareable links (HIGH priority for analytics)
- localStorage provides persistence across sessions (LOW priority for filters)
- React state drives UI updates
- Single source of truth (URL) prevents sync issues

**Trade-offs:**
- URL can get long with many filters → Use abbreviated param names
- localStorage sync is async → Debounce writes (300ms)
- Back/forward navigation works automatically with URL state

#### 2. Server State (React Query)

**Pattern:** Keep existing custom hooks, wrap with React Query for budget CRUD

```typescript
// Current pattern (useExpenses, useIncomes) - KEEP AS IS
// They already work well, no need to refactor

// NEW pattern for budgets
function useBudgets(groupId?: string) {
  return useQuery({
    queryKey: ['budgets', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: NewBudget) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert(budget)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget skapad!');
    },
    // Optimistic updates NOT recommended for budgets
    // Financial data should wait for server confirmation
  });
}
```

**Why React Query for budgets:**
- Built-in caching reduces database reads
- Automatic background refetch on window focus
- Mutation invalidation keeps data fresh
- No need to refactor working expense/income hooks

**Why NOT optimistic updates for budgets:**
- Financial data requires server confirmation (HIGH priority)
- Budget calculations involve server-side logic (validation, aggregation)
- Poor UX if optimistic update rolls back on financial data

#### 3. Drill-Down State (Local Component State)

```typescript
// DrillDownPanel.tsx
interface DrillDownState {
  isOpen: boolean;
  type: 'category' | 'member' | 'budget' | null;
  id: string | null;
}

function DrillDownPanel() {
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    isOpen: false,
    type: null,
    id: null,
  });

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Desktop: Side panel (react-resizable-panels)
  if (!isMobile && drillDown.isOpen) {
    return (
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={60}>
          {/* Main content */}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
          <DrillDownContent {...drillDown} />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  // Mobile: Bottom sheet (Drawer from vaul)
  return (
    <>
      {/* Main content */}
      <Drawer open={drillDown.isOpen} onOpenChange={(open) =>
        setDrillDown(prev => ({ ...prev, isOpen: open }))
      }>
        <DrawerContent>
          <DrillDownContent {...drillDown} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

**Why local state for drill-down:**
- Ephemeral UI state (doesn't need persistence)
- No shareability requirement
- Simpler than URL state for transient panels

### Tab Navigation with URL Sync

```typescript
// AnalyticsCockpit/index.tsx
function AnalyticsCockpit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div>
      <FilterBar /> {/* Shared across all tabs */}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="categories">Kategorier</TabsTrigger>
          <TabsTrigger value="members">Medlemmar</TabsTrigger>
          <TabsTrigger value="trends">Trender</TabsTrigger>
          <TabsTrigger value="budgets">Budgetar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

**Why URL-based tabs:**
- Direct links to specific tabs (/analys?tab=budgets)
- Browser back/forward navigation works
- Tab state survives page refresh
- Shareable analytics views

## Data Flow Architecture

### Budget CRUD Flow

```
User Action → Mutation → Supabase → React Query Cache Update → UI Refresh

Example: Create Budget
1. User submits budget form
2. useCreateBudget mutation fires
3. Supabase insert with RLS check
4. On success: invalidate ['budgets'] query
5. React Query refetches budget list
6. UI updates with new budget
7. Toast notification confirms

No optimistic updates (financial data requires confirmation)
```

### Filter Change Flow

```
User adjusts filter → URL updates → localStorage syncs → Data refetches

Example: Change date range
1. User selects new month in FilterBar
2. setFilters updates URL searchParams
3. Debounced localStorage write
4. URL change triggers useMemo recalculation in tabs
5. Filtered data updates
6. Charts re-render with new data

All tabs share filter state via URL (single source of truth)
```

### Drill-Down Flow

```
Click chart segment → Open panel → Fetch detail data → Render

Example: Click category in donut chart
1. onClick handler in CategoryDonut
2. setDrillDown({ isOpen: true, type: 'category', id: categoryId })
3. DrillDownPanel renders (side panel or bottom sheet)
4. CategoryDetail fetches transactions for category
5. Display breakdown by member, time, etc.

Desktop: Side panel (react-resizable-panels)
Mobile: Bottom sheet (Drawer from vaul)
```

## Component Boundaries

### FilterBar Component (Shared)

**Responsibility:**
- Manage filter UI (date range, categories, members)
- Sync filters to URL + localStorage
- Provide filter reset functionality

**Communicates With:**
- URL (via useSearchParams)
- localStorage (direct)
- All tab components (via URL state)

**Props:** None (reads/writes URL directly)

### Tab Components (CategoriesTab, MembersTab, etc.)

**Responsibility:**
- Read filters from URL
- Compute tab-specific analytics
- Render visualizations
- Handle click-to-drill-down

**Communicates With:**
- FilterBar (reads URL state)
- DrillDownPanel (triggers via local state)
- Data hooks (useExpenses, useIncomes, useBudgets)

**Props:** None (reads URL for filters)

### DrillDownPanel Component

**Responsibility:**
- Responsive panel rendering (desktop vs mobile)
- Panel open/close state
- Route to correct detail component

**Communicates With:**
- Detail components (CategoryDetail, MemberDetail, etc.)
- Parent tab (receives drillDown state)

**Props:**
```typescript
interface DrillDownPanelProps {
  isOpen: boolean;
  type: 'category' | 'member' | 'budget' | null;
  id: string | null;
  onClose: () => void;
}
```

## Build Order (Dependency-Based)

### Phase 1: Foundation (No new features, just refactor)

**Goal:** Split monolithic Analys.tsx into composable structure

1. **Create shared types** (`analytics.ts`)
   - Filter interfaces
   - Tab configuration
   - Drill-down types

2. **Extract filter logic** (`useAnalyticsFilters.ts`)
   - Move selectedYear/selectedMonth to URL state
   - Add localStorage sync
   - Keep existing filter computation logic

3. **Create FilterBar component**
   - Extract date picker UI from Analys.tsx
   - Wire to useAnalyticsFilters
   - Test URL sync + localStorage persistence

4. **Create OverviewTab component**
   - Copy existing Analys.tsx content
   - Replace filter state with useAnalyticsFilters
   - Verify charts still work

5. **Create AnalyticsCockpit shell**
   - Add Tabs component with URL sync
   - Render FilterBar + OverviewTab
   - Test navigation + filter persistence

**Validation:** Overview tab works identically to old Analys.tsx

**Estimated effort:** 1-2 days

### Phase 2: Tab Structure (Add tabs, no drill-down yet)

**Goal:** Add 4 remaining tabs with basic visualizations

6. **CategoriesTab**
   - Category spending breakdown (existing donut chart)
   - Top categories table
   - Month-over-month comparison

7. **MembersTab**
   - Spending by member (bar chart)
   - Member contribution % (donut)
   - Who paid vs who owes (balance chart)

8. **TrendsTab**
   - Existing trend chart (full width)
   - Seasonality analysis
   - Expense velocity (spending rate over time)

9. **BudgetsTab stub**
   - Empty state ("Coming soon")
   - Placeholder for Phase 3

**Validation:** All tabs render, share filter state, no drill-down yet

**Estimated effort:** 2-3 days

### Phase 3: Drill-Down Panels

**Goal:** Add click-through details with responsive panels

10. **Create DrillDownPanel component**
    - Responsive wrapper (desktop: side panel, mobile: bottom sheet)
    - Wire to react-resizable-panels (desktop)
    - Wire to Drawer/vaul (mobile)

11. **CategoryDetail component**
    - Transaction list for category
    - Breakdown by member
    - Time distribution

12. **MemberDetail component**
    - Member's transactions
    - Category breakdown for member
    - Payment history

13. **Wire drill-down to tabs**
    - CategoriesTab: Click category → CategoryDetail
    - MembersTab: Click member → MemberDetail
    - Test resize behavior (desktop) + swipe gesture (mobile)

**Validation:** Click chart → panel opens → detail loads → close panel works

**Estimated effort:** 2-3 days

### Phase 4: Budget System (New feature)

**Goal:** Add budget tracking with CRUD operations

14. **Database schema** (Supabase migration)
    ```sql
    CREATE TABLE budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      period TEXT NOT NULL, -- 'monthly', 'yearly'
      category TEXT, -- Optional: budget per category
      start_date DATE NOT NULL,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    CREATE INDEX idx_budgets_group ON budgets(group_id);
    CREATE INDEX idx_budgets_period ON budgets(group_id, start_date, end_date);
    ```

15. **useBudgets hook** (React Query)
    - Query: fetch budgets for group
    - Mutations: create, update, delete
    - No optimistic updates (financial data)

16. **BudgetDetail component**
    - Progress bar (spent vs budget)
    - Remaining amount
    - Days left in period
    - Trend vs budget

17. **BudgetsTab full implementation**
    - Budget list with progress
    - Create budget form (Drawer on mobile, Dialog on desktop)
    - Click budget → BudgetDetail panel
    - Budget vs actual comparison chart

**Validation:** Create budget → appears in list → click → detail panel → delete → removed

**Estimated effort:** 3-4 days

## Scalability Considerations

### Performance Optimizations

**Current scale (100-1000 expenses):**
- useMemo for computed analytics (existing, keep)
- React Query caching (5min stale time)
- Virtualization NOT needed yet

**At 10K expenses:**
- Add pagination to transaction lists in drill-down panels
- Implement server-side aggregation (Supabase functions)
- Consider memoizing expensive chart data transformations

**At 100K expenses:**
- Move all aggregations to database (Supabase views)
- Implement infinite scroll for transaction lists
- Add date range limits to prevent loading all data

### Code Splitting

```typescript
// Lazy load tab components
const CategoriesTab = lazy(() => import('./tabs/CategoriesTab'));
const MembersTab = lazy(() => import('./tabs/MembersTab'));
const TrendsTab = lazy(() => import('./tabs/TrendsTab'));
const BudgetsTab = lazy(() => import('./tabs/BudgetsTab'));

// Lazy load drill-down panels
const DrillDownPanel = lazy(() => import('./drilldown/DrillDownPanel'));
```

**Why lazy loading:**
- Reduce initial bundle size (each tab ~50-100KB)
- Faster time to interactive for Overview tab
- Users rarely visit all tabs in one session

## Architecture Patterns to Follow

### Pattern 1: Shared Filter State via URL

**What:** All tabs read filter state from URL searchParams

**When:** Any state that needs to be shared across tabs or shareable via link

**Example:**
```typescript
// FilterBar.tsx
const { filters, setFilters } = useAnalyticsFilters();

// CategoriesTab.tsx
const { filters } = useAnalyticsFilters();
const filteredData = useMemo(() =>
  filterExpensesByDateRange(expenses, filters.dateRange),
  [expenses, filters.dateRange]
);
```

**Benefit:** Single source of truth, no prop drilling, shareable state

### Pattern 2: Responsive Panel Pattern

**What:** Desktop renders side panel, mobile renders bottom sheet

**When:** Any drill-down or detail view that supplements main content

**Example:**
```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

return isMobile ? (
  <Drawer open={isOpen} onOpenChange={setIsOpen}>
    <DrawerContent>{children}</DrawerContent>
  </Drawer>
) : (
  <ResizablePanelGroup>
    <ResizablePanel>{mainContent}</ResizablePanel>
    <ResizableHandle />
    <ResizablePanel>{children}</ResizablePanel>
  </ResizablePanelGroup>
);
```

**Benefit:** Native feel on mobile (swipe gesture), efficient use of screen space on desktop

### Pattern 3: React Query for New Features Only

**What:** Keep existing custom hooks, use React Query for new CRUD operations

**When:** Adding new data models (budgets) that need caching and mutations

**Example:**
```typescript
// Existing: Keep as is
const { expenses } = useExpenses(groupId);

// New: Use React Query
const { data: budgets } = useBudgets(groupId);
const createBudget = useCreateBudget();
```

**Benefit:** Don't refactor working code, leverage React Query for complex mutations

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Prop Drilling Filter State

**What goes wrong:** Passing filter state as props through multiple component layers

**Why bad:**
- Tight coupling between components
- Hard to add new filters
- URL state and prop state can desync

**Prevention:** Use URL state as single source of truth, read with useSearchParams

### Anti-Pattern 2: Optimistic Updates for Financial Data

**What goes wrong:** Updating UI before server confirms budget creation/update

**Why bad:**
- Rollback UX is jarring for financial data
- Users lose trust if budget disappears
- Can show incorrect totals during optimistic period

**Prevention:** Wait for server confirmation, use loading states instead

### Anti-Pattern 3: Fetching All Data Upfront

**What goes wrong:** Loading all expenses/budgets on mount, filtering in memory

**Why bad:**
- Slow initial load as data grows
- Unnecessary database reads
- Client-side filtering breaks at scale

**Prevention:**
- Use Supabase filters in queries (`.gte()`, `.lte()` for date ranges)
- Implement pagination for large lists
- Let database do aggregations

### Anti-Pattern 4: Separate State for Desktop vs Mobile

**What goes wrong:** Different component trees or state management for desktop/mobile

**Why bad:**
- Code duplication
- Bugs only appear on one platform
- Hard to maintain feature parity

**Prevention:** Use responsive components that adapt, share state and logic

## Integration Points

### With Existing Codebase

**Analys.tsx replacement:**
```
Before: /analys route → Analys.tsx (700 lines)
After: /analys route → AnalyticsCockpit → tabs/OverviewTab.tsx (refactored)
```

**Shared hooks (no changes needed):**
- `useExpenses` - Keep as is
- `useIncomes` - Keep as is
- `useGroups` - Keep as is

**New hooks (add alongside existing):**
- `useAnalyticsFilters` - Filter state management
- `useBudgets` - Budget CRUD

**UI components (already available):**
- `Tabs` from @radix-ui/react-tabs (shadcn/ui)
- `Drawer` from vaul (shadcn/ui)
- `ResizablePanelGroup` from react-resizable-panels (available)

### With Supabase Backend

**Existing tables (no schema changes):**
- `expenses` - Read by all tabs
- `incomes` - Read by Overview and Trends tabs
- `groups` - Read by FilterBar (member filter)

**New table (Phase 4):**
- `budgets` - CRUD by BudgetsTab

**RLS policies needed:**
```sql
-- Users can only see budgets for groups they're members of
CREATE POLICY "Users can view budgets for their groups"
  ON budgets FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

-- Users can create budgets for their groups
CREATE POLICY "Users can create budgets for their groups"
  ON budgets FOR INSERT
  WITH CHECK (group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

-- Similar policies for UPDATE and DELETE
```

## Testing Strategy

### Unit Tests (Component Level)

```typescript
// FilterBar.test.tsx
test('updates URL when date range changes', () => {
  const { getByLabelText } = render(<FilterBar />);
  const monthPicker = getByLabelText('Välj månad');

  fireEvent.change(monthPicker, { target: { value: '2026-02' } });

  expect(window.location.search).toContain('month=2');
  expect(window.location.search).toContain('year=2026');
});

// DrillDownPanel.test.tsx
test('renders side panel on desktop', () => {
  mockMediaQuery('(min-width: 769px)');

  const { getByTestId } = render(
    <DrillDownPanel isOpen type="category" id="food" />
  );

  expect(getByTestId('resizable-panel')).toBeInTheDocument();
  expect(queryByTestId('drawer')).not.toBeInTheDocument();
});

test('renders bottom sheet on mobile', () => {
  mockMediaQuery('(max-width: 768px)');

  const { getByTestId } = render(
    <DrillDownPanel isOpen type="category" id="food" />
  );

  expect(getByTestId('drawer')).toBeInTheDocument();
  expect(queryByTestId('resizable-panel')).not.toBeInTheDocument();
});
```

### Integration Tests (Flow Level)

```typescript
test('filter changes update all tabs', async () => {
  const { getByText, getByLabelText } = render(<AnalyticsCockpit />);

  // Change filter
  const monthPicker = getByLabelText('Välj månad');
  fireEvent.change(monthPicker, { target: { value: '2026-02' } });

  // Switch tabs
  fireEvent.click(getByText('Kategorier'));

  // Verify filter persisted
  expect(window.location.search).toContain('month=2');
  expect(getByText('Februari 2026')).toBeInTheDocument();
});

test('drill-down flow works end-to-end', async () => {
  const { getByTestId, getByText } = render(<CategoriesTab />);

  // Click category in chart
  const foodCategory = getByTestId('category-food');
  fireEvent.click(foodCategory);

  // Verify panel opened
  await waitFor(() => {
    expect(getByTestId('drill-down-panel')).toBeInTheDocument();
  });

  // Verify detail loaded
  expect(getByText('Mat & Dryck')).toBeInTheDocument();
});
```

### E2E Tests (User Journey)

```typescript
test('user can create and track budget', async () => {
  await signIn('user@example.com', 'password');

  // Navigate to budgets tab
  await page.goto('/analys?tab=budgets');

  // Create budget
  await page.click('[data-testid="create-budget-button"]');
  await page.fill('[name="name"]', 'Mat-budget');
  await page.fill('[name="amount"]', '5000');
  await page.selectOption('[name="period"]', 'monthly');
  await page.click('[data-testid="submit-budget"]');

  // Verify budget appears
  await expect(page.locator('text=Mat-budget')).toBeVisible();
  await expect(page.locator('text=5000 kr')).toBeVisible();

  // Click budget to see details
  await page.click('text=Mat-budget');

  // Verify detail panel
  await expect(page.locator('[data-testid="budget-progress"]')).toBeVisible();
});
```

## Migration Path from Current Analys.tsx

### Step-by-step Refactor

1. **Create parallel structure** (no breaking changes)
   - Create `src/pages/AnalyticsCockpit/` directory
   - Keep existing `Analys.tsx` as is
   - Build new structure alongside

2. **Extract shared logic**
   - Move filter state to `useAnalyticsFilters` hook
   - Extract chart data transformations to utility functions
   - Create shared types in `analytics.ts`

3. **Create OverviewTab**
   - Copy content from Analys.tsx
   - Replace local filter state with `useAnalyticsFilters`
   - Test thoroughly - should be pixel-perfect match

4. **Wire up cockpit shell**
   - Create `AnalyticsCockpit/index.tsx` with Tabs
   - Add FilterBar component
   - Add OverviewTab as first tab
   - Update route: `/analys` → `<AnalyticsCockpit />`

5. **Deprecate old Analys.tsx**
   - Keep as backup for 1 sprint
   - Remove after validation

### Rollback Plan

If new architecture causes issues:
1. Revert route change (point back to old Analys.tsx)
2. Keep new code in `/AnalyticsCockpit` for debugging
3. Fix issues with new architecture
4. Re-deploy when stable

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Component structure | HIGH | Standard React patterns, proven with Radix UI + shadcn/ui |
| Filter state (URL + localStorage) | HIGH | Documented pattern, multiple sources confirm approach |
| React Query for budgets | HIGH | Official TanStack docs, 2026 best practices confirmed |
| Responsive panel pattern | HIGH | Vaul (already in package.json), react-resizable-panels (proven) |
| Build order | MEDIUM | Logical dependencies, but timeline estimates may vary |
| Performance at scale | MEDIUM | Current architecture works at 100-1000 records, needs testing at 10K+ |

## Open Questions for Phase-Specific Research

### Phase 2 (Tabs) Questions
- Which member spending visualizations provide most value?
- Should TrendsTab support custom date ranges beyond month/year?
- How to handle empty states when filters return no data?

### Phase 3 (Drill-Down) Questions
- What's the ideal default size for side panels? (suggest 40% width)
- Should drill-down state persist in URL? (suggest NO - too transient)
- How to handle drill-down on small tablets? (suggest mobile pattern at <1024px)

### Phase 4 (Budgets) Questions
- Should budgets support rolling periods? (e.g., "last 30 days" vs "this month")
- How to handle budget overage notifications? (toast? badge? both?)
- Should budget progress use optimistic calculations or wait for server?

## Sources

**State Management Patterns:**
- [Advanced React state management using URL parameters - LogRocket Blog](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)
- [State Management 2025: React, Server State, URL State - Medium](https://medium.com/@QuarkAndCode/state-management-2025-react-server-state-url-state-dapr-agent-sync-d8a1f6c59288)
- [React Query as a State Manager - TkDodo's blog](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025)

**React Query Patterns:**
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Mastering Mutations in React Query - TkDodo's blog](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [Optimistic Updates - TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Concurrent Optimistic Updates in React Query - TkDodo's blog](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

**Tab + URL State:**
- [How to make Radix UI Tabs URL based in NextJS - DEV Community](https://dev.to/yinks/how-to-make-radix-ui-tabs-url-based-in-nextjs-2nfn)
- [Tab Nav – Radix Themes](https://www.radix-ui.com/themes/docs/components/tab-nav)
- [Implementing dynamic tabs in React - React Router Discussion](https://github.com/remix-run/react-router/discussions/11040)

**Responsive Panels:**
- [Vaul - React Drawer Component](https://github.com/emilkowalski/vaul)
- [Vaul Documentation](https://vaul.emilkowal.ski/)
- [Drawer - shadcn/ui](https://ui.shadcn.com/docs/components/drawer)

**Dashboard Architecture:**
- [Building a React-Based Analytics Dashboard - DEV Community](https://dev.to/ali_dz/building-a-react-based-analytics-dashboard-from-scratch-3-parts-in-one-guide-3ok)
- [How to Create Dashboard in React: 2025 Guide - DataBrain](https://www.usedatabrain.com/how-to/create-react-dashboard)
- [ReactJS Development for Real-Time Analytics Dashboards - Makers' Den](https://makersden.io/blog/reactjs-dev-for-real-time-analytics-dashboards)

**Filter Persistence:**
- [The URL is a Great Place to Store State in React](https://www.oscarbustos.dev/blog/react-url-state-management/)
- [Persisting React State in localStorage - Josh W. Comeau](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)
- [Retaining React UI state without localStorage - CodeBrahma](https://codebrahma.com/retaining-react-ui-state-without-localstorage-or-redux-persist/)
