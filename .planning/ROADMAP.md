# Roadmap: Paronsplit Analytics Enhancement

## Overview

Transform Paronsplit's basic analytics into a proactive budgeting cockpit. Users will filter by date ranges and members, drill down into category spending without losing context, and track budgets with visual progress indicators. The journey follows a dependency-driven path: establish flexible filtering first, enhance data fetching to support it, build responsive drill-down panels, add budget storage and tracking, then polish with advanced visualizations and member breakdowns.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Filter Foundation** - Date range and member filtering with URL state
- [ ] **Phase 2: Enhanced Data Fetching** - Filter-aware data hooks and queries
- [ ] **Phase 3: Category Visualization** - Bar charts with top N control
- [ ] **Phase 4: Drill-Down Panels** - Responsive side panel/bottom sheet for transactions
- [ ] **Phase 5: Budget Backend** - Database schema and CRUD operations
- [ ] **Phase 6: Budget Tracking UI** - Progress bars, pacing insights, and polish

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
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md - URL filter state hook and date preset utilities
- [ ] 01-02-PLAN.md - Member filter multi-select component
- [ ] 01-03-PLAN.md - FilterBar integration into Analys page

### Phase 2: Enhanced Data Fetching
**Goal**: All analytics data reflects selected filters from Phase 1
**Depends on**: Phase 1
**Requirements**: TECH-02 (currency storage foundation for all data operations)
**Success Criteria** (what must be TRUE):
  1. Existing useExpenses and useIncomes hooks accept filter parameters (date range, member IDs)
  2. Charts update automatically when filters change without page reload
  3. Currency values are stored and calculated as integers (cents) to prevent rounding errors
  4. Loading states display correctly during data refetch on filter change
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 3: Category Visualization
**Goal**: Users see spending breakdown by category in interactive bar chart
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-06
**Success Criteria** (what must be TRUE):
  1. Category bar chart displays showing spending per category for selected date range
  2. Chart shows top 8 categories by default with "Show all" toggle to expand
  3. User can toggle stacked mode to see spending per member within each category
  4. Charts render correctly on mobile devices with explicit height constraints (no invisible charts)
**Plans**: TBD

Plans:
- [ ] TBD

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
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 5: Budget Backend
**Goal**: Budget data storage and retrieval infrastructure is production-ready
**Depends on**: Phase 2
**Requirements**: BUD-01
**Success Criteria** (what must be TRUE):
  1. Supabase budgets table exists with columns: id, group_id, category, amount, enabled, period
  2. RLS policies allow all household members to create, read, update, and delete budgets for their group
  3. useBudgets hook follows existing pattern (useExpenses/useIncomes) and provides CRUD operations
  4. Budget amounts are stored as integers (cents) consistent with expense storage
**Plans**: TBD

Plans:
- [ ] TBD

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
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Filter Foundation | 0/3 | Ready | - |
| 2. Enhanced Data Fetching | 0/TBD | Not started | - |
| 3. Category Visualization | 0/TBD | Not started | - |
| 4. Drill-Down Panels | 0/TBD | Not started | - |
| 5. Budget Backend | 0/TBD | Not started | - |
| 6. Budget Tracking UI | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-27 - Phase 1 planned with 3 plans in 2 waves*
