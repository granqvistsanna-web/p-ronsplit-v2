# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Users can see where their money goes and whether they're on track with their budget — at a glance, with the ability to drill deeper without losing context.
**Current focus:** Phase 5 complete - Budget Backend. Ready for Phase 6 - Budget Tracking UI.

## Current Position

Phase: 5 of 6 (Budget Backend)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-01-28 — Completed 05-02-PLAN.md (useBudgets React Query hook)

Progress: [██████████████] 100% (12 of 12 current plans completed)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 2.3 min
- Total execution time: 0.47 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Filter Foundation | 3 | 7 min | 2 min |
| 2. Enhanced Data Fetching | 3 | 6 min | 2 min |
| 3. Category Visualization | 2 | 6 min | 3 min |
| 4. Drill-Down Panels | 2 | 5 min | 2.5 min |
| 5. Budget Backend | 2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 03-02 (3 min), 04-01 (3 min), 04-02 (2 min), 05-01 (4 min), 05-02 (2 min)
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Filter bar as foundation first: All views depend on consistent filtering — impacts Phase 1 priority
- Budgets in Supabase not localStorage: Sync between household members — drives Phase 5 architecture
- Date presets only, no custom range: Reduce complexity for v1 — constrains Phase 1 filter UI
- Side panel + bottom sheet for drill-down: Better UX than full navigation or modal — defines Phase 4 approach
- Date objects serialized to ISO strings in query keys for stable comparison (02-01)
- Hierarchical query key structure enables granular cache invalidation (02-01)
- Integer storage (ore) for all currency to prevent floating-point errors (02-02)
- BIGINT database type for monetary amounts provides sufficient range (02-02)
- Empty selectedIds represents "all members" state in MemberFilter (01-02)
- Popover + Command pattern for searchable multi-select filters (01-02)
- Filter objects passed to hooks instead of individual parameters for extensibility (02-03)
- Empty groupId string prevents query execution via enabled guard (02-03)
- Member filter on paid_by for expenses, recipient for incomes (02-03)
- Mutations invalidate all list queries for safety (02-03)
- Remove previous month comparison in metrics for v1 simplicity (01-03)
- Use dateRange.end for monthlyTrend calculation endpoint (01-03)
- Format date range with date-fns sv locale for consistent Swedish display (01-03)
- Use reduce() for single-pass category aggregation (03-01)
- min-h-[300px] prevents mobile chart collapse in Recharts (03-01)
- Top 8 categories by default with showAll expansion prop (03-01)
- Angled X-axis labels (-45°) prevent category name overlap (03-01)
- stackId="members" for proper vertical stacking in Recharts (03-02)
- Dynamic member keys in StackedCategoryData for flexible member counts (03-02)
- Zero-fill member amounts for complete data structure (03-02)
- Toggle component for stacked mode switch (better UX than checkbox) (03-02)
- Self-contained chart sections with internal controls reduce coupling (03-02)
- Responsive dialog pattern: Sheet (>=768px) + Drawer (<768px) via useIsMobile (04-01)
- 44px touch target minimum for accessibility compliance on close buttons (04-01)
- CSS selector [&>button] for targeting Sheet's built-in close button sizing (04-01)
- Recharts payload extraction with fallback for click handlers (04-02)
- Reset selectedCategory on panel close prevents stale data flash (04-02)
- Read-only drill-down (no onEdit) for v1 simplicity (04-02)
- TEXT group_id without FK reference (groups table lacks primary key constraint) (05-01)
- BIGINT for budget amount column (ore storage consistent with expenses/incomes) (05-01)
- RLS policies use ::text cast for group_id comparison (05-01)
- BudgetFilters uses same pattern as ExpenseFilters/IncomeFilters for consistency (05-02)
- saveBudget uses upsert on (group_id, category, period) for idempotent creates (05-02)
- No date serialization needed for budget query keys (no dateRange field) (05-02)

### Pending Todos

None yet.

### Blockers/Concerns

- Groups table lacks proper primary key constraint - prevents FK references from other tables

## Session Continuity

Last session: 2026-01-28T18:50:28Z
Stopped at: Completed 05-02-PLAN.md (useBudgets React Query hook)
Resume file: None
