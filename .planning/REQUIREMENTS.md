# Requirements: Päronsplit Analytics Enhancement

**Defined:** 2026-01-27
**Core Value:** Users can see where their money goes and whether they're on track with their budget

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Filter Bar

- [ ] **FILT-01**: User can filter analytics by date range using presets (This month, Last month, Last 30 days, YTD, Last 3/6/12 months)
- [ ] **FILT-02**: User can filter by household member via multi-select (default: all members)
- [ ] **FILT-03**: Reset link appears when filters deviate from default

### Categories Breakdown

- [ ] **CAT-01**: User sees category bar chart showing spending per category
- [ ] **CAT-02**: Bar chart shows top 8 categories with "Show all" option to expand
- [ ] **CAT-03**: User can click category in chart to open drill-down panel
- [ ] **CAT-04**: Drill-down shows as side panel on desktop (≥768px)
- [ ] **CAT-05**: Drill-down shows as bottom sheet on mobile (<768px)
- [ ] **CAT-06**: User can toggle stacked mode to see spending per member within each category
- [ ] **CAT-07**: Drill-down panel shows transactions for selected category with amounts and dates

### Budgets

- [ ] **BUD-01**: Budgets stored in Supabase table with group-based RLS (all household members can CRUD)
- [ ] **BUD-02**: User can set budget amount per category
- [ ] **BUD-03**: User can enable/disable budget tracking per category
- [ ] **BUD-04**: User sees progress bar showing budget vs actual spending
- [ ] **BUD-05**: Progress bar color indicates status: neutral (<80%), warning (80-100%), error (>100%)
- [ ] **BUD-06**: User sees pacing insight ("on track" vs "over pace" based on day in period)

### Technical

- [ ] **TECH-01**: Charts render correctly on mobile with explicit height constraints
- [ ] **TECH-02**: Currency stored as integers (cents) to prevent rounding errors
- [ ] **TECH-03**: Touch targets are minimum 44px on mobile

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Filter Bar Enhancements

- **FILT-04**: URL query params for deep linking (share filtered views)
- **FILT-05**: Filter state persisted to localStorage per user

### Categories Enhancements

- **CAT-08**: Donut chart with "Other" bucket grouping categories under 3%
- **CAT-09**: Interactive legend to toggle category series on/off

### Budget Enhancements

- **BUD-07**: Smart budget suggestion using last 3 months average
- **BUD-08**: Budget onboarding empty state with CTA

### Analytics Tabs

- **TAB-01**: Overview tab with KPI cards (Total expenses, income, net, savings rate)
- **TAB-02**: Members tab with per-member spending and contribution ranking
- **TAB-03**: Trends tab with daily spend line chart and smoothing options

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Custom date range calendar picker | Presets cover 90% of use cases, adds complexity |
| Bank account linking | Security concerns, existing manual entry workflow |
| AI/chatbot for financial advice | Regulatory concerns, maintenance burden |
| Real-time notifications | Different feature scope, not analytics |
| Comparison to previous period overlay | Deferred, adds chart complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILT-01 | TBD | Pending |
| FILT-02 | TBD | Pending |
| FILT-03 | TBD | Pending |
| CAT-01 | TBD | Pending |
| CAT-02 | TBD | Pending |
| CAT-03 | TBD | Pending |
| CAT-04 | TBD | Pending |
| CAT-05 | TBD | Pending |
| CAT-06 | TBD | Pending |
| CAT-07 | TBD | Pending |
| BUD-01 | TBD | Pending |
| BUD-02 | TBD | Pending |
| BUD-03 | TBD | Pending |
| BUD-04 | TBD | Pending |
| BUD-05 | TBD | Pending |
| BUD-06 | TBD | Pending |
| TECH-01 | TBD | Pending |
| TECH-02 | TBD | Pending |
| TECH-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after initial definition*
