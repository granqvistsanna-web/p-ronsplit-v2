# Roadmap: Päronsplit Analytics Enhancement

## Overview

Transform Päronsplit's basic analytics into a proactive budgeting cockpit. Users will filter by date ranges and members, drill down into category spending without losing context, and track budgets with visual progress indicators. The journey follows a dependency-driven path: establish flexible filtering first, enhance data fetching to support it, build responsive drill-down panels, add budget storage and tracking, then polish with advanced visualizations and member breakdowns.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Filter Foundation** - Date range and member filtering with URL state
- [x] **Phase 2: Enhanced Data Fetching** - Filter-aware data hooks and queries
- [x] **Phase 3: Category Visualization** - Bar charts with top N control
- [x] **Phase 4: Drill-Down Panels** - Responsive side panel/bottom sheet for transactions
- [x] **Phase 5: Budget Backend** - Database schema and CRUD operations
- [x] **Phase 6: Budget Tracking UI** - Progress bars, pacing insights, and polish
- [ ] **Phase 7: Wire Filters to Main Page** - Fix integration gap from audit (GAP CLOSURE)

## Phase Details

### Phase 1: Filter Foundation
**Goal**: Users can filter analytics by date range and household members with shareable URLs
**Depends on**: Nothing (first phase)
**Requirements**: FILT-01, FILT-02, FILT-03
**Success Criteria** (what must be TRUE):
  1. User can select date range from presets (This month, Last month, Last 30 days, YTD, Last 3/6/12 months)
  2. User can filter by household member via multi-select dropdown (default: all members)
  3. URL updates when filters change, making filtered views shareable via link copy
  4. Reset link appears when filters deviate from defaults and returns to initial state when clicked
  5. Browser back/forward buttons work correctly with filter changes
**Plans**: 3

Plans:
- [x] 01-01: useFilterParams hook and date presets (2026-01-28)
- [x] 01-02: MemberFilter multi-select component (2026-01-28)
- [x] 01-03: FilterBar and Analys integration (2026-01-28)

### Phase 2: Enhanced Data Fetching
**Goal**: All analytics data reflects selected filters from Phase 1
**Depends on**: Phase 1
**Requirements**: TECH-02 (currency storage foundation for all data operations)
**Success Criteria** (what must be TRUE):
  1. Existing useExpenses and useIncomes hooks accept filter parameters (date range, member IDs)
  2. Charts update automatically when filters change without page reload
  3. Currency values are stored and calculated as integers (cents) to prevent rounding errors
  4. Loading states display correctly during data refetch on filter change
**Plans**: 3

Plans:
- [x] 02-01: Query key factory and filter types (2026-01-28)
- [x] 02-02: Currency utilities and database migration (2026-01-28)
- [x] 02-03: React Query hook conversion (2026-01-28)

### Phase 3: Category Visualization
**Goal**: Users see spending breakdown by category in interactive bar chart
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-06
**Success Criteria** (what must be TRUE):
  1. Category bar chart displays showing spending per category for selected date range
  2. Chart shows top 8 categories by default with "Show all" toggle to expand
  3. User can toggle stacked mode to see spending per member within each category
  4. Charts render correctly on mobile devices with explicit height constraints (no invisible charts)
**Plans**: 2

Plans:
- [x] 03-01: Category aggregation utilities and bar chart component (2026-01-28)
- [x] 03-02: Stacked mode, controls, and Analys integration (2026-01-28)

### Phase 4: Drill-Down Panels
**Goal**: Users can click categories to see transaction details without losing context
**Depends on**: Phase 3
**Requirements**: CAT-03, CAT-04, CAT-05, CAT-07, TECH-03
**Success Criteria** (what must be TRUE):
  1. Clicking a category bar opens drill-down panel showing filtered transactions
  2. On desktop (>=768px), drill-down displays as side panel overlaying main content
  3. On mobile (<768px), drill-down displays as bottom sheet with swipe-to-dismiss
  4. Panel shows transaction list with dates, amounts, and category name
  5. All touch targets are minimum 44px for mobile accessibility
  6. Closing panel returns to category chart without data loss
**Plans**: 2

Plans:
- [x] 04-01: TransactionList and CategoryDrillDown responsive components (2026-01-28)
- [x] 04-02: Bar click handlers and CategoryChartSection integration (2026-01-28)

### Phase 5: Budget Backend
**Goal**: Budget data storage and retrieval infrastructure is production-ready
**Depends on**: Phase 2
**Requirements**: BUD-01
**Success Criteria** (what must be TRUE):
  1. Supabase budgets table exists with columns: id, group_id, category, amount, enabled, period
  2. RLS policies allow all household members to create, read, update, and delete budgets for their group
  3. useBudgets hook follows existing pattern (useExpenses/useIncomes) and provides CRUD operations
  4. Budget amounts are stored as integers (cents) consistent with expense storage
**Plans**: 2

Plans:
- [x] 05-01: Database migration with budgets table and RLS policies (2026-01-28)
- [x] 05-02: useBudgets React Query hook with CRUD operations (2026-01-28)

### Phase 6: Budget Tracking UI
**Goal**: Users can set budgets and see visual progress with pacing insights
**Depends on**: Phase 5
**Requirements**: BUD-02, BUD-03, BUD-04, BUD-05, BUD-06, TECH-01
**Success Criteria** (what must be TRUE):
  1. User can set budget amount for any category via budget setup dialog
  2. User can enable/disable budget tracking per category with toggle
  3. Budget vs actual spending displays as progress bar with percentage
  4. Progress bar color indicates status: neutral gray (<80%), warning yellow (80-100%), error red (>100%)
  5. Pacing insight displays ("On track" vs "Over pace") based on current day in period
  6. All Recharts components have explicit height constraints to prevent layout issues
**Plans**: 2 plans

Plans:
- [x] 06-01: Pacing calculation utilities in budgetUtils.ts (2026-01-28)
- [x] 06-02: Pacing insight UI in BudgetCategoryList and BudgetOverviewSection (2026-01-28)

### Phase 7: Wire Filters to Main Page (GAP CLOSURE)
**Goal**: Pass filter parameters to data hooks in Analys.tsx and remove client-side workaround
**Depends on**: Phase 6
**Gap Closure**: Closes integration gap from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. useExpenses hook in Analys.tsx receives dateRange and memberIds from useFilterParams
  2. useIncomes hook in Analys.tsx receives dateRange and memberIds from useFilterParams
  3. Client-side filtering code (lines 38-53) is removed as no longer needed
  4. Charts display correctly with server-side filtered data
**Plans**: 1

Plans:
- [ ] 07-01: Wire filters to hooks and remove client-side filtering

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Filter Foundation | 3/3 | Complete | 2026-01-28 |
| 2. Enhanced Data Fetching | 3/3 | Complete | 2026-01-28 |
| 3. Category Visualization | 2/2 | Complete | 2026-01-28 |
| 4. Drill-Down Panels | 2/2 | Complete | 2026-01-28 |
| 5. Budget Backend | 2/2 | Complete | 2026-01-28 |
| 6. Budget Tracking UI | 2/2 | Complete | 2026-01-28 |
| 7. Wire Filters to Main Page | 0/1 | Pending | — |
