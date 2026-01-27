# Päronsplit Analytics Enhancement

## What This Is

Enhanced analytics page for Päronsplit, a Swedish household expense splitting app. Transforms the existing basic charts into a "cockpit" experience with flexible date filtering, category breakdown with drill-down, and budget tracking per category. Built for two household members who want to understand their spending patterns and stay within budget.

## Core Value

Users can see where their money goes and whether they're on track with their budget — at a glance, with the ability to drill deeper without losing context.

## Requirements

### Validated

- ✓ Month/year picker for filtering data — existing
- ✓ KPI cards showing income, expenses, netto with delta vs previous month — existing
- ✓ Trend chart showing 6-month history — existing
- ✓ Donut chart for category distribution — existing
- ✓ Category list with expandable transaction details — existing
- ✓ Skeleton loading states — existing
- ✓ Keyboard navigation for month picker (Cmd+arrows) — existing

### Active

- [ ] Persistent filter bar with date range presets (This month, Last month, Last 30 days, YTD, Last 3/6/12 months)
- [ ] URL query params for deep linking (share a specific view)
- [ ] localStorage persistence for filter state per user
- [ ] Reset link that appears when filters deviate from default
- [ ] Category bar chart with Top N control (default 8, show all option)
- [ ] Stacked mode per member in category charts
- [ ] Side panel drill-down on desktop, bottom sheet on mobile
- [ ] "Other" bucket for small categories (<3%) in donut chart
- [ ] Budget setup per category with amounts and enable toggle
- [ ] "Use last 3 months average" suggestion for budget setup
- [ ] Budget vs actual progress bars with status states (neutral <80%, warning 80-100%, error >100%)
- [ ] Pacing insight (on track vs over pace based on day in period)
- [ ] Comparison toggle for previous period overlay
- [ ] Empty/loading/error states following spec patterns

### Out of Scope

- Overview with daily spend line chart — deferred, focus on categories and budgets first
- Members analytics (per-member spending, contribution ranking) — deferred to v2
- Trends view as separate tab — use existing trend chart for now
- Custom date range calendar picker — use presets only for v1
- Budget onboarding empty state with CTA — start with budget list directly
- Interactive legend toggle series on/off — nice to have, not essential
- Long-press legend menu on mobile — complexity vs value

## Context

**Existing codebase:**
- React 18 + TypeScript + Vite
- Supabase for backend (auth, database)
- Recharts for charts (already used)
- shadcn/ui + Radix UI components
- React Query for data fetching
- Month-based filtering via useMonthSelection context

**Current analytics components:**
- `TrendChart`, `CategoryDonut`, `CategoryLegend`, `ComparisonBar` in `src/components/analytics/`
- Data hooks: `useExpenses`, `useIncomes`, `useGroups`

**Categories:**
- Both predefined and user-created categories exist
- Stored with expenses in Supabase

**Budget storage:**
- New `budgets` table needed in Supabase
- Schema: group_id, category, amount, enabled, period (monthly)

## Constraints

- **Tech stack**: Must use existing Recharts, shadcn/ui, Supabase — no new major dependencies
- **Database**: Budgets require new Supabase table with RLS policies
- **Locale**: Swedish locale for currency formatting (sv-SE)
- **Mobile**: Bottom sheet for drill-down on mobile, side panel on desktop
- **Accessibility**: Touch targets 44px, keyboard navigation, color not sole information carrier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Filter bar as foundation first | All views depend on consistent filtering | — Pending |
| Budgets in Supabase not localStorage | Sync between household members | — Pending |
| Date presets only, no custom range | Reduce complexity for v1 | — Pending |
| Side panel + bottom sheet for drill-down | Better UX than full navigation or modal | — Pending |
| Skip Overview KPIs and Members for v1 | Focus on Categories + Budgets first | — Pending |

---
*Last updated: 2027-01-27 after initialization*
