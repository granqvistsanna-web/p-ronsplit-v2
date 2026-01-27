# Project Research Summary

**Project:** Päronsplit Analytics Cockpit v2.0
**Domain:** Household expense tracking analytics dashboard
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Analytics dashboards for couple/roommate expense tracking are a mature domain with well-established patterns. Users expect flexible date filtering with presets, clear balance tracking with debt simplification, and visual budget progress tracking. The good news: the existing Päronsplit stack (React Query, Supabase, Recharts) is well-positioned for this feature with minimal new dependencies needed.

The recommended approach is refactoring the monolithic 700-line Analys.tsx into a composable tab-based architecture using URL state management as the single source of truth. This enables shareable links, tab persistence, and eliminates prop drilling while leveraging existing data hooks. The critical path is: date range filtering foundation → balance tracking → budget system → drill-down interactions. Each phase builds on the previous, with clear validation points.

Key risks center on timezone edge cases (DST transitions in March/October), rounding errors in balance calculations, and chart performance at scale. These are all preventable with specific testing strategies: test with DST boundary dates, use deterministic rounding with validation invariants, and implement data decimation for large datasets. The research confidence is HIGH for core patterns, with some gaps around budget carry-over behavior that need clarification during planning.

## Key Findings

### Recommended Stack

No new libraries required. The existing stack already includes everything needed: React Router v6 for URL state, date-fns for date calculations, Recharts for visualization, and React Query for server state. The only additions are patterns: URL state management via custom hooks wrapping useSearchParams, date range presets using date-fns functions, and a new Supabase budgets table with RLS policies.

**Core technologies:**
- **React Router v6 useSearchParams**: URL state management — already installed, type-safe with Zod validation wrapper
- **date-fns**: Date range presets — already installed, handles all preset logic (thisMonth, last30Days, YTD)
- **Recharts**: Visualization — already installed, sufficient for MVP (no new charting library needed)
- **React Query**: Budget CRUD — already installed, use for new budget mutations with cache invalidation
- **Radix UI Tabs**: Tab navigation — already installed via shadcn/ui, syncs to URL automatically
- **Vaul Drawer**: Mobile drill-down — already installed, provides native-feeling bottom sheet

**Optional (only if needed):**
- **nuqs**: Type-safe URL params — only if custom hook becomes unwieldy (>5 params)

### Expected Features

Research reveals clear patterns for what users expect in couple/roommate expense analytics versus what differentiates products versus what to avoid.

**Must have (table stakes):**
- Date range presets (This month, Last 30 days, YTD, Last year) — industry standard in all analytics
- Start/end date picker with range visualization — users need custom ranges beyond presets
- KPI trend indicators (up/down arrows with MoM comparison) — users need to know if improving
- Balance simplification with debt shuffling — minimize payments needed (Splitwise pattern)
- Clear "who owes whom" display — show settlement amount without calculation
- Budget progress bars with color coding — visual spending vs limit representation
- Category breakdown with interactive filtering — users need to see where money goes
- Empty states with guidance — first-time users need direction, not blank screens
- Responsive mobile design — personal finance is mobile-first (44px touch targets)

**Should have (competitive differentiators):**
- URL deep linking — share specific view/date range with household partner
- Date range persistence — users don't want to reselect every session
- Multi-threshold budget alerts — progressive warnings (70%/90%/100%) vs binary
- Shared/Personal/Mixed toggle — couples need joint vs individual spending visibility
- Drill-down to transaction details — click KPI → see contributing transactions
- Transaction count context in KPIs — "12 expenses, avg 450 kr" explains changes
- Budget forecast at current pace — "you'll exceed by X kr" projection

**Defer to v2+ (anti-features or premature):**
- Too many date presets (>7) — creates decision fatigue
- Auto-refresh without indicator — users get disoriented
- Income-based split calculator — complex, defer to v2 if 50/50 insufficient
- YoY comparison — nice-to-have, not essential for couples tracking expenses
- Advanced budget features — rolling periods, seasonal adjustments, templates

### Architecture Approach

Refactor from monolithic 700-line Analys.tsx to composable tab-based system while preserving existing data fetching patterns. Use URL state as single source of truth (shareable, persistent) with localStorage fallback, keep existing custom hooks (useExpenses, useIncomes), and add React Query only for new budget CRUD operations. Implement responsive drill-down panels: desktop renders side panel (react-resizable-panels), mobile renders bottom sheet (Vaul Drawer).

**Major components:**
1. **AnalyticsCockpit shell** — Orchestrates tab routing, renders shared FilterBar, syncs active tab to URL
2. **FilterBar (shared)** — Date range picker, member/category filters, syncs to URL + localStorage
3. **Tab components** — OverviewTab (refactored Analys.tsx), CategoriesTab, MembersTab, TrendsTab, BudgetsTab (NEW)
4. **DrillDownPanel** — Responsive wrapper (desktop: side panel, mobile: bottom sheet) with detail components
5. **useAnalyticsFilters hook** — URL state management with localStorage persistence, Zod validation
6. **useBudgets hook** — React Query for budget CRUD with cache invalidation (no optimistic updates for financial data)

### Critical Pitfalls

1. **DST timezone edge cases** — Date filtering produces incorrect results during DST transitions (March 29, October 25 in Sweden). Store all timestamps in UTC, use IANA timezones (Europe/Stockholm), normalize date boundaries, and specifically test with DST transition dates.

2. **Balance calculation rounding errors** — Per-member balances don't sum to total expenses due to inconsistent rounding. Use deterministic rounding (banker's rounding), apply exactly once at transaction creation, validate invariant (total expenses === sum of member shares), store with 2 decimal precision.

3. **Budget overspending state confusion** — System shows "0 remaining" instead of "350 SEK over budget". Model budget states explicitly (under | approaching | exceeded), calculate both remaining AND overspending, define "approaching" threshold (80%), use progressive color coding (green → orange → red).

4. **Chart drill-down performance collapse** — Initial load fast but drill-down freezes UI (8+ seconds). Use Canvas rendering for large datasets (>500 points), decimate data intelligently, implement pagination, debounce date range changes (300ms), memoize expensive calculations and chart components.

5. **Swedish currency formatting** — Show "1234.56 kr" instead of Swedish standard "1 234,56 kr". Use Intl.NumberFormat with sv-SE locale (space thousands separator, comma decimal, symbol after amount).

## Implications for Roadmap

Based on research, suggested phase structure follows dependency hierarchy and de-risks critical pitfalls early:

### Phase 1: Foundation & Date Filtering
**Rationale:** Date range filtering is foundational — all analytics views depend on it. Addressing DST/timezone pitfalls here prevents data integrity issues later. Refactoring monolithic Analys.tsx into composable structure enables parallel development of later phases.

**Delivers:**
- Composable component structure (AnalyticsCockpit shell, FilterBar, OverviewTab)
- URL state management with localStorage persistence
- Date range presets (thisMonth, last30Days, YTD, lastYear)
- Custom date range picker with Swedish calendar (Monday start)
- DST-safe date filtering with UTC normalization

**Addresses features:**
- Date range presets (table stakes)
- Start/end date picker (table stakes)
- URL deep linking (differentiator)
- Date range persistence (differentiator)

**Avoids pitfalls:**
- DST timezone edge cases (CRITICAL #1) — test with March 29, October 25 dates
- Date range re-renders (MODERATE #8) — debounce input changes, memoize components

**Research flag:** Standard patterns, skip phase-specific research.

---

### Phase 2: Tab Structure & Category Analytics
**Rationale:** With filter foundation in place, add remaining tabs using shared filter state. Categories tab leverages existing donut chart. Trends tab uses existing line chart. Members tab requires new balance calculation logic — validates rounding approach before budget system.

**Delivers:**
- CategoriesTab with category breakdown (donut + table)
- MembersTab with per-member spending and balance tracking
- TrendsTab with time series visualization
- Balance simplification algorithm (debt shuffling)
- Deterministic rounding validation

**Addresses features:**
- Category breakdown (table stakes)
- Balance simplification (table stakes)
- Who owes whom display (table stakes)
- KPI trend indicators (table stakes)
- MoM comparison (table stakes)

**Avoids pitfalls:**
- Balance calculation rounding errors (CRITICAL #2) — validate invariants
- Swedish currency formatting (MINOR #10) — use sv-SE locale consistently

**Research flag:** Balance simplification algorithm is well-documented (Splitwise pattern), skip phase-specific research.

---

### Phase 3: Budget System
**Rationale:** Budget tracking is a new feature requiring database schema changes. Building after balance tracking ensures rounding logic is validated. Budget progress visualization reuses category breakdown patterns from Phase 2.

**Delivers:**
- Supabase budgets table with RLS policies
- useBudgets hook with React Query (query + mutations)
- BudgetsTab with budget list and progress bars
- Budget creation/edit forms (Drawer on mobile, Dialog on desktop)
- Multi-threshold alerts (70%/90%/100%)
- Budget vs actual comparison

**Addresses features:**
- Budget progress bars (table stakes)
- Multi-threshold alerts (differentiator)
- Budget forecast (differentiator)

**Avoids pitfalls:**
- Budget overspending state confusion (CRITICAL #3) — model states explicitly
- Partial month calculations (MODERATE #6) — prorate on mid-month changes
- Budget carry-over confusion (MODERATE #9) — document reset vs rollover model

**Research flag:** Needs phase-specific research for:
- Budget carry-over behavior (reset vs rollover) — user preference unclear
- Proration rules for mid-month changes — validation needed
- Alert timing and notification strategy — UX research gap

---

### Phase 4: Drill-Down Interactions
**Rationale:** Drill-down adds depth without changing core analytics. Implements responsive panels (desktop side panel, mobile bottom sheet) for detail views. Performance testing with large datasets critical before launch.

**Delivers:**
- DrillDownPanel responsive wrapper (react-resizable-panels + Vaul Drawer)
- CategoryDetail component (transaction list, member breakdown)
- MemberDetail component (member transactions, category breakdown)
- BudgetDetail component (progress, remaining days, trend vs budget)
- Click-through from charts to details
- Mobile swipe gestures and desktop resize

**Addresses features:**
- Clickable KPI drill-down (table stakes)
- Transaction count context (differentiator)

**Avoids pitfalls:**
- Chart drill-down performance collapse (CRITICAL #4) — load test with 1000+ transactions
- Hierarchy drill-down too deep (MODERATE #7) — limit to 3-5 levels
- Data inconsistencies between summary and detail (MINOR #14) — use same query logic

**Research flag:** Needs phase-specific research for:
- Optimal panel sizes (desktop side panel default width)
- Breakpoint for mobile vs tablet vs desktop patterns
- Load testing strategy for performance validation

---

### Phase Ordering Rationale

- **Phase 1 first** because date filtering is foundational dependency for all views. DST pitfalls must be solved early to prevent data integrity issues.
- **Phase 2 before Phase 3** because balance tracking validates rounding logic needed for budget calculations. Category/member tabs leverage existing charts with minimal new code.
- **Phase 3 before Phase 4** because drill-down panels show budget details. Budget state model must be stable before building detail views.
- **Phase 4 last** because drill-down is additive (doesn't change core analytics) and requires performance testing infrastructure that takes time to set up.

Grouping follows architecture boundaries: Phase 1 = foundation, Phase 2 = read-only analytics, Phase 3 = write operations (budgets), Phase 4 = UX enhancements. This allows parallel development after Phase 1 completes.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Budget System):** Budget model decision (reset vs rollover), proration rules, alert strategy — sparse documentation on user preferences for couple/roommate context
- **Phase 4 (Drill-Down):** Performance optimization strategy, responsive breakpoints, load testing approach — implementation-specific decisions

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Date Filtering):** Well-documented patterns (React Router useSearchParams, date-fns presets)
- **Phase 2 (Tab Structure):** Standard React patterns (Radix UI Tabs, balance simplification algorithms documented)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies already installed, patterns verified in official docs |
| Features | HIGH | Table stakes and differentiators clear from multiple sources, Splitwise pattern well-documented |
| Architecture | HIGH | React Query patterns documented, URL state approach proven, responsive panel libraries already in use |
| Pitfalls | HIGH | DST dates confirmed for Sweden 2026, rounding issues well-known in expense splitting, chart performance documented |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive but some areas need validation during planning/execution:

- **Budget carry-over behavior** — Reset monthly vs rollover (envelope budgeting) decision unclear. Research found both patterns but no clear guidance for couple/roommate context. Recommendation: Start with reset monthly (simpler), add rollover if users request it.

- **Budget proration edge cases** — Mid-month budget changes have multiple calculation methods (actual days, 30-day month, calendar month). Recommendation: Use actual days in month for accuracy, make proration visible in UI.

- **Drill-down panel sizing** — Optimal default size for desktop side panel unclear from research (sources suggest 30-40% width). Recommendation: Start with 40%, make resizable, track user behavior.

- **Mobile vs tablet breakpoint** — Research unclear on whether tablets (768-1024px) should use mobile pattern (bottom sheet) or desktop pattern (side panel). Recommendation: Test with actual devices, likely use mobile pattern <1024px for consistent touch UX.

- **Performance thresholds** — At what data volume does drill-down performance collapse? Research suggests >500 data points for SVG, but depends on device. Recommendation: Load test with 1 year realistic data (600+ transactions), measure Time to Interactive, optimize if >2s.

## Sources

### Primary (HIGH confidence)
- React Router v6 official documentation — useSearchParams API
- TanStack Query official documentation — React Query patterns, mutation invalidation
- date-fns official documentation — Date calculations, locale handling
- Supabase official documentation — RLS policies, table schema patterns
- Radix UI official documentation — Tabs component API
- Vaul official documentation — Drawer component patterns
- Recharts official documentation — Performance optimization
- Splitwise algorithm documentation — Debt simplification patterns

### Secondary (MEDIUM confidence)
- LogRocket blog — React URL state management patterns
- TkDodo's blog — React Query best practices (2025 edition)
- MUI X documentation — Date range picker patterns (UI reference only)
- Dashboard UX guides — Drill-down interaction patterns, empty states
- Timeanddate.com — Swedish DST dates for 2026 (March 29, October 25)

### Tertiary (LOW confidence)
- GitHub examples — Expense tracker implementations (reference only, not production patterns)
- Medium articles — Budget tracking schema patterns (needs validation)
- Community forums — Rounding error discussions (informative but not authoritative)

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
