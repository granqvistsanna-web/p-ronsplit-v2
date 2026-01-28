---
phase: 03-category-visualization
plan: 02
subsystem: ui
tags: [recharts, stacked-chart, toggle, member-breakdown, analytics, filters]

# Dependency graph
requires:
  - phase: 03-category-visualization
    plan: 01
    provides: CategoryBarChart component and aggregation utilities
  - phase: 02-enhanced-data-fetching
    provides: useExpenses hook with React Query and filter support
  - phase: 01-filter-foundation
    provides: useFilterParams hook for date/member filtering
provides:
  - Stacked aggregation by category and member (aggregateByCategoryAndMember)
  - CategoryBarChart stacked mode with member breakdown
  - CategoryChartSection with stacked toggle and show all controls
  - Integrated category visualization in Analys page
affects:
  - 05-budget-tracking (May reuse stacked aggregation for budget vs actual by member)
  - Future drill-down features (04-expense-drill-down can link from category bars)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic chartConfig generation for variable member counts"
    - "stackId prop for Recharts stacked bars (vertical stacking)"
    - "Toggle component pattern for mode switching"
    - "Conditional Bar rendering based on stacked prop"
    - "Map-based member aggregation with zero-fill for missing data"

key-files:
  created:
    - src/components/analytics/CategoryChartSection.tsx
  modified:
    - src/lib/categoryUtils.ts
    - src/components/analytics/CategoryBarChart.tsx
    - src/components/analytics/index.ts
    - src/pages/Analys.tsx

key-decisions:
  - "Stacked bars use stackId='members' for proper vertical stacking (not side-by-side)"
  - "Dynamic member keys in StackedCategoryData interface for flexible member counts"
  - "Zero-fill member amounts for categories they didn't spend in (ensures complete data)"
  - "Toggle component for stacked mode (better UX than checkbox)"
  - "Show all button only appears when >8 categories exist (reduces clutter)"
  - "CategoryChartSection self-contained with internal state (no props from parent)"
  - "Legend shows member colors in stacked mode for clarity"
  - "Enhanced tooltip shows per-member breakdown in stacked mode with total"

patterns-established:
  - "Self-contained chart sections with internal controls and state"
  - "Conditional rendering based on mode toggles (stacked vs simple)"
  - "Dynamic data key iteration for variable-length member lists"
  - "Chart config generation from member list with color assignment"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase 3 Plan 2: Category Visualization with Stacked Member Breakdown Summary

**Stacked member breakdown mode with toggle controls, showing per-member spending within each category using Recharts stacked bars with automatic filter integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T14:31:05Z
- **Completed:** 2026-01-28T14:34:48Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Stacked category aggregation utility grouping by category then member
- CategoryBarChart extended with stacked mode using stackId for vertical stacking
- CategoryChartSection with "Per medlem" toggle and "Alla/Topp 8" button
- Integrated into Analys page with automatic filter synchronization
- Enhanced tooltip showing member breakdown in stacked mode
- Custom legend displaying member colors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stacked aggregation utility** - `4bb402e` (feat)
2. **Task 2: Update CategoryBarChart for stacked mode** - `47b1dd5` (feat)
3. **Task 3: Create CategoryChartSection with controls** - `6115473` (feat)
4. **Task 4: Integrate into Analys page** - `c0fe809` (feat)

## Files Created/Modified
- `src/lib/categoryUtils.ts` - Added StackedCategoryData interface and aggregateByCategoryAndMember function using Map-based grouping, zero-fills missing member data
- `src/components/analytics/CategoryBarChart.tsx` - Extended with stacked prop, conditional Bar rendering with stackId="members", dynamic chartConfig generation, enhanced tooltip with member breakdown, custom legend
- `src/components/analytics/CategoryChartSection.tsx` - New self-contained component with Toggle for stacked mode, Button for show all, loading state, integrates useFilterParams and useExpenses
- `src/components/analytics/index.ts` - Added CategoryChartSection export
- `src/pages/Analys.tsx` - Added CategoryChartSection card between ComparisonBar and donut chart sections

## Decisions Made

**1. stackId="members" for proper vertical stacking**
- Recharts requires same stackId for bars to stack vertically
- Different stackIds create grouped/side-by-side bars instead
- Critical pattern for stacked bar charts

**2. Dynamic member keys in StackedCategoryData**
- Interface uses index signature `[memberId: string]: number | string`
- Allows variable member counts without type errors
- Data keys match member.user_id for consistent lookup

**3. Zero-fill member amounts in aggregation**
- Members with no spending in a category get 0 amount
- Ensures complete data structure for all categories
- Prevents missing keys in chart data

**4. Toggle component for stacked mode**
- Better UX than checkbox (visual on/off state)
- Size="sm" keeps controls compact
- Users icon + "Per medlem" label clarifies purpose

**5. Show all button conditional**
- Only appears when categoryData.length > 8
- Reduces clutter when few categories
- Dynamic label shows total count

**6. Self-contained CategoryChartSection**
- No props from parent (uses hooks directly)
- Internal state for showAll and stackedMode
- Reduces coupling with Analys page

**7. Enhanced tooltip for stacked mode**
- Shows breakdown per member with amounts
- Includes total at bottom with border separator
- Filters out members with 0 spending for cleaner display

**8. Custom legend with member colors**
- Shows member name + color square
- Matches chart-N CSS variables for consistency
- Helps users understand stacked bar segments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified without blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 4 (Expense drill-down):**
- Category chart provides clickable bars for drill-down entry points
- Stacked bars can show per-member detail before drilling deeper
- Filter integration ensures consistent drill-down context

**Ready for Phase 5 (Budget tracking):**
- Stacked aggregation pattern reusable for budget vs actual by member
- CategoryChartSection pattern can be adapted for budget comparison charts
- Toggle pattern established for switching visualization modes

**No blockers or concerns.**

---
*Phase: 03-category-visualization*
*Completed: 2026-01-28*
