# Project Research Summary

**Project:** Päronsplit v2 - Analytics Dashboard Enhancement
**Domain:** Personal Finance Analytics (Household Expense Splitting)
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Päronsplit is adding advanced analytics features to an existing React/TypeScript/Supabase household expense splitting app. The research confirms the existing stack (React 18, TypeScript, Vite, Recharts, shadcn/ui, Supabase) is excellent for these enhancements. Only one new library is recommended (nuqs for URL state management), adding just 6 kB to the bundle.

The analytics enhancement transforms the app from a passive transaction viewer into a proactive budgeting tool. Research shows the winning pattern combines reactive insights (where money went, category breakdowns, trends) with proactive controls (budgets, pacing alerts, visual warnings). The table stakes have risen: users now expect date range presets, drill-down without page navigation, and budget tracking with color-coded progress bars. For a 2-person household, the key differentiator is deep linking for view sharing ("look at our grocery spending") which requires URL-based filter state.

The critical risks center on performance (Recharts degrades with >1000 data points), URL state management (dual source of truth creates bugs), and currency precision (floating-point rounding causes budget discrepancies). All three are preventable with patterns identified in research: data aggregation for large datasets, URL-as-single-source-of-truth architecture, and integer-based currency arithmetic.

## Key Findings

### Recommended Stack

The existing stack is production-ready for all planned features. The only addition needed is nuqs for type-safe URL state management, which handles query parameter serialization, debouncing, and browser history management better than manual React Router `useSearchParams`. All other functionality leverages installed libraries: react-day-picker for date ranges, shadcn/ui Sheet + Vaul Drawer for responsive drill-down panels, and Recharts for interactive charts with onClick handlers.

**Core technologies:**
- **nuqs** (6 kB): Type-safe URL state management — eliminates manual serialization, provides useState-like API for query params, prevents browser history spam
- **React Router useSearchParams**: URL state source of truth — enables deep linking, shareable filtered views, browser back/forward support
- **shadcn/ui Date Range Picker** (copy-paste): Date filtering with presets — production-ready component with customizable presets (Last 7/30 days, YTD, This month)
- **Sheet + Drawer** (already installed): Responsive drill-down — Radix Dialog for desktop side panel, Vaul for mobile bottom sheet
- **Recharts** (already installed): Interactive charts — supports onClick for drill-down, tooltip customization, responsive containers
- **Supabase PostgreSQL**: Budget storage — new `budgets` table with RLS policies matching existing group-based access pattern

**What NOT to add:**
- Redux/Zustand (overkill for filter state)
- Tremor/Mantine/MUI (duplicates shadcn/ui)
- React Query migration (current custom hooks work well)

### Expected Features

**Must have (table stakes):**
- Date range filtering with presets (Last 7/30 days, This month, Last month, YTD, Last 3/6/12 months) — every competitor has this, typing dates is friction
- Category breakdown visualization (bar/donut charts) — core value proposition of "see where money goes"
- Drill-down without navigation — side panel (desktop) or bottom sheet (mobile) preserves context, full-page navigation breaks flow
- Budget vs actual comparison — primary use case is "am I on track?", color-coded progress bars (green/yellow/red) are universal pattern
- Mobile-optimized interactions — touch targets 44px+, bottom sheets, no hover-only features

**Should have (competitive):**
- Deep linking for shared views — critical for 2-person household: "look at our grocery spending this month" sends exact filtered view to partner
- Pacing insights — "You're 60% through budget but only 40% through month" shifts from reactive to proactive budgeting
- Filter state persistence — remember user's preferred view via localStorage, reduces repeated selections
- Smart budget suggestions — "Use last 3 months average" reduces setup friction, huge onboarding improvement
- Stacked breakdown by member — unique to shared household context, answers "who spent what on groceries?"

**Defer (v2+):**
- Custom date range calendar picker — presets cover 90% of use cases, adds complexity
- Account linking/bank sync — massive security/trust concerns, manual entry already established
- AI/chatbot for financial advice — regulatory concerns, maintenance burden
- Credit score/investment tracking — scope creep, different mental model

### Architecture Approach

The architecture follows URL-as-source-of-truth for filter state, with filters passed to existing custom data hooks (useExpenses, useIncomes) rather than migrating to React Query. Drill-down panels use conditional rendering based on screen size (Sheet for desktop, Drawer for mobile) following the adaptive panel pattern established in shadcn/ui. Budget data lives in a new Supabase `budgets` table with RLS policies matching the existing group_members pattern.

**Major components:**
1. **AnalyticsFiltersProvider** — Context wrapper around useSearchParams providing typed filter interface, single source of truth for date range/member/category filters
2. **DrillDownPanel** — Adaptive component using Sheet (desktop) or Drawer (mobile) based on useIsMobile hook, displays filtered transactions with budget progress
3. **BudgetTracker** — Progress bars using existing shadcn/ui Progress component, color-coded status (neutral <80%, warning 80-100%, error >100%), pacing insights
4. **FilterBar** — Date preset selector, member filter, category filter, all synced to URL via setSearchParams with "Reset" button visible when non-default
5. **Enhanced Data Hooks** — useExpenses/useIncomes extended to accept filter params (startDate, endDate, memberIds), new useBudgets hook following existing pattern

**Data flow:** URL params → AnalyticsFiltersProvider → typed filters → data hooks → filtered queries → components → drill-down via local state + optional URL sync

### Critical Pitfalls

1. **ResponsiveContainer height undefined** — Recharts ResponsiveContainer with `height="100%"` requires explicit height on parent. Missing height causes invisible charts or infinite growth. Fix: wrap all charts in `<div className="h-[300px]">` or use shadcn/ui ChartContainer with min-h.

2. **Large dataset performance cliff (>1000 points)** — Recharts recalculates all chart elements on state change, causing 500ms+ lag with thousands of expense records. Fix: aggregate expenses by week/month for ranges >90 days, implement data decimation using LTTB algorithm, use stable dataKey references.

3. **URL state dual source of truth** — Managing filters in both React state and URL separately causes sync bugs: back button doesn't work, shared links show different data, refresh loses state. Fix: URL params are the ONLY state (not a copy), parse once at boundary, use functional updates for setSearchParams.

4. **Currency precision rounding errors** — JavaScript floating-point can't represent decimals exactly, causing "budget met shows 100.1%" or category totals not summing to displayed total. Fix: store amounts in cents (integers), round once at display boundary, use epsilon (0.01 kr) for comparisons, aggregate before rounding.

5. **Mobile touch interactions broken** — Recharts tooltips default to hover-only, drill-down taps trigger parent navigation, users can't see chart details on mobile. Fix: implement onClick handlers for tooltips, use bottom sheet for mobile drill-down, ensure 44px+ touch targets, test on real devices not DevTools.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order: filter foundation first (all features depend on it), then enhanced data fetching, drill-down panels (independent of budgets), budget backend, budget UI, and polish.

### Phase 1: Filter Foundation
**Rationale:** All other features (drill-down, budgets, charts) need filtering to work properly. URL state pattern must be established early to avoid rework. This is the highest-risk phase due to URL state sync pitfall.
**Delivers:** Users can filter analytics by date range (with presets), see URL update, share filtered views via link, browser back/forward works
**Addresses:** Date presets (table stakes), deep linking (differentiator), filter persistence
**Avoids:** Pitfall #3 (URL state dual source of truth) by establishing URL-as-single-source pattern from day one

### Phase 2: Enhanced Data Fetching
**Rationale:** Builds on Phase 1 filter state, required for drill-down and budgets. Extends existing hooks rather than introducing new patterns.
**Delivers:** All analytics reflect selected filters, member/category filtering works, data hooks accept filter params
**Uses:** Existing useExpenses/useIncomes pattern, Supabase query building
**Implements:** Filter-aware data layer, query construction with date ranges

### Phase 3: Drill-Down Panel
**Rationale:** Independent of budgets, provides high user value early. Mobile-first design prevents mobile-as-afterthought pitfall.
**Delivers:** Click category to see transaction details in side panel (desktop) or bottom sheet (mobile), responsive behavior tested
**Addresses:** Drill-down without navigation (table stakes)
**Avoids:** Pitfall #5 (mobile touch interactions) by designing mobile bottom sheet BEFORE desktop side panel, Pitfall #8 (data overload) via progressive disclosure

### Phase 4: Budget Schema & Hook
**Rationale:** Backend work before UI. Establishes database layer needed for Phase 5. Currency precision strategy defined here.
**Delivers:** Supabase `budgets` table with RLS policies, useBudgets hook following existing pattern, CRUD operations tested
**Uses:** Supabase PostgreSQL NUMERIC type (not FLOAT), RLS policies matching group_members pattern
**Avoids:** Pitfall #4 (currency precision) by defining rounding strategy, storing in cents, testing edge cases

### Phase 5: Budget UI
**Rationale:** Depends on Phase 4 schema and Phase 2 filtered data. This is where budget tracking becomes user-facing.
**Delivers:** Users can set budgets per category, see progress bars, get smart suggestions from historical averages, view pacing insights
**Addresses:** Budget vs actual (table stakes), pacing insights (differentiator), smart suggestions (differentiator)
**Implements:** BudgetTracker component, BudgetSetupDialog, progress bars integrated into drill-down

### Phase 6: Polish & Advanced Features
**Rationale:** Nice-to-have enhancements, not blocking core functionality. Handles performance optimization for power users.
**Delivers:** "Other" bucket for small categories, stacked mode per member, comparison toggle, localStorage persistence, performance tuning
**Addresses:** Stacked breakdown by member (differentiator)
**Avoids:** Pitfall #2 (large dataset performance) by implementing aggregation before users accumulate >1000 expenses

### Phase Ordering Rationale

- **Filter foundation first:** Everything depends on it (drill-down needs filtered data, budgets need date ranges). Establishing URL-as-state early prevents dual source of truth bugs.
- **Drill-down before budgets:** They're independent, drill-down provides value sooner, and designing mobile-first prevents UX debt.
- **Budget backend before UI:** Prevents UI rework when data model changes. Defining currency precision strategy at database layer (NUMERIC type, cents storage) eliminates rounding bugs.
- **Polish last:** Power-user features like stacked member breakdown and performance tuning should wait until core workflows are validated.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Filter Foundation):** URL state management pattern selection (nuqs vs manual useSearchParams) — needs decision point on type safety vs simplicity tradeoff
- **Phase 4 (Budget Schema):** Supabase migration creation, RLS policy testing — standard but needs validation that group-based access pattern works for budgets

Phases with standard patterns (skip research-phase):
- **Phase 2 (Enhanced Data Fetching):** Extends existing useExpenses pattern, well-understood Supabase query building
- **Phase 3 (Drill-Down Panel):** Uses existing Sheet/Drawer components, responsive pattern already established in codebase
- **Phase 5 (Budget UI):** Standard CRUD forms, Progress component already installed, patterns clear from research
- **Phase 6 (Polish):** Recharts performance optimization, localStorage persistence — both have documented solutions

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official documentation, existing dependencies checked via package.json analysis |
| Features | HIGH | Verified across 10+ competitor products (YNAB, Mint, Monarch, Zeta, Honeydue), table stakes vs differentiators validated via UX case studies |
| Architecture | HIGH | Patterns verified from existing codebase analysis (useExpenses, MonthSelectionProvider, shadcn/ui usage), React Router and Supabase official docs |
| Pitfalls | HIGH | Recharts-specific issues confirmed via multiple GitHub issues with solutions, currency precision follows standard financial calculation patterns |

**Overall confidence:** HIGH

### Gaps to Address

**2-person household context specificity:** Limited research on household splitting apps specifically (most sources are solo budgeting apps like YNAB or couples apps like Honeydue). Extrapolated from couples budgeting patterns. During implementation, validate assumptions about member filtering and stacked breakdowns with actual 2-person household workflows.

**Recharts v3 compatibility:** Research based on Recharts v2.15.4 (current installed version). Recharts v3 is in development with breaking changes. If upgrading during project, revalidate ResponsiveContainer patterns and shadcn/ui ChartContainer compatibility.

**Mobile performance on mid-range devices:** Performance recommendations based on desktop/high-end mobile testing patterns. During Phase 6 polish, test on real mid-range Android devices (not just iOS or browser DevTools) to validate that data aggregation thresholds (>1000 points, >90 day ranges) are appropriate.

## Sources

### Primary (HIGH confidence)
- **STACK.md:** nuqs official documentation, React Router useSearchParams API, shadcn/ui component docs, Recharts official examples
- **FEATURES.md:** YNAB vs Mint comparison (Moneywise, GoBankingRates), Best budgeting apps 2026 (CNBC Select, Family Money Adventure), dashboard best practices (Qlik, ZebraBI, F9 Finance)
- **ARCHITECTURE.md:** Codebase analysis (package.json, useExpenses.tsx, Analys.tsx, App.tsx), React Router official docs, Radix UI Dialog primitives, Supabase RLS documentation
- **PITFALLS.md:** Recharts GitHub issues (#1146 performance, #1545 ResponsiveContainer, #164 stacked negatives), LogRocket URL state management articles, financial precision guides (Medium, CloudBeds)

### Secondary (MEDIUM confidence)
- Mobile UX patterns (Letsgroto, Sanjaydey blog posts) — general patterns not specific to expense analytics
- React Query integration patterns (TkDodo blog, TanStack docs) — not Recharts-specific but well-documented

### Tertiary (LOW confidence)
- Pacing insights as differentiator — novel concept, logical but not widely documented as standard feature
- Member stacked breakdown priority — extrapolated from household context, needs user validation

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
