# Domain Pitfalls: Analytics Dashboard for Expense Tracking

**Domain:** Expense tracking analytics with date filtering, balance tracking, and budgets
**Researched:** 2026-01-27
**Context:** Adding analytics features to existing Swedish household expense tracker (Päronsplit)

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major architectural issues.

### Pitfall 1: Date Range Timezone and DST Edge Cases

**What goes wrong:** Date filtering produces incorrect results during DST transitions, excludes valid expenses, or double-counts transactions. Users see different data depending on when they query.

**Why it happens:**
- Expenses stored in local time (Europe/Stockholm) without timezone metadata
- Date range boundaries calculated using browser's current timezone offset
- DST transitions occur at 2:00 AM → 3:00 AM (March 29, 2026) and 3:00 AM → 2:00 AM (October 25, 2026)
- Ambiguous times during "fall back" transition can occur twice
- Assuming all months have 30 days when calculating partial periods

**Consequences:**
- Expenses entered at 2:30 AM on DST transition days are missing or duplicated
- Monthly summaries off by several hours of expenses
- Budget calculations incorrect for transition months
- Per-member balances don't reconcile with individual expense sums

**Prevention:**
1. **Store all timestamps in UTC** with original timezone for display
2. **Use IANA timezone names** (Europe/Stockholm), not abbreviations (CET/CEST)
3. **Normalize date range boundaries** to start-of-day UTC before queries
4. **Use date-fns or temporal libraries** that handle DST correctly
5. **Test specifically with DST transition dates**: March 29 and October 25, 2026

**Detection warning signs:**
- Users report "missing expenses" around late March or late October
- Month-end summaries don't match manual addition
- Balance calculations produce different results on different days
- Unit tests pass but integration tests fail near DST dates

**Phase implications:**
- **Phase 1 (Date Range Filtering):** Must address immediately—this is foundational
- Include DST edge case tests in acceptance criteria
- Budget all date filtering work with DST testing time

**Sources:**
- [Moment Timezone Guides](https://momentjs.com/timezone/guides/)
- [Daylight Saving Time 2026 Sweden](https://www.timeanddate.com/time/change/sweden/stockholm)
- [CoreUI: Managing Date and Time in Timezones with JavaScript](https://coreui.io/blog/how-to-manage-date-and-time-in-specific-timezones-using-javascript/)

---

### Pitfall 2: Balance Calculation Rounding Errors

**What goes wrong:** Per-member balances don't sum to total expenses. Differences of 1-2 SEK accumulate over time, causing "unbalanced books" that users notice and distrust.

**Why it happens:**
- Splitting odd-amount expenses (e.g., 49 SEK) by two produces 24.50 each
- Swedish rounding rules: cash rounds to whole kronor, electronic payments use öre (2 decimals)
- Rounding at display time vs. storage time creates inconsistencies
- Accumulation of rounding errors over hundreds of transactions
- Deterministic rounding not used (sometimes rounds up, sometimes down for same amount)

**Consequences:**
- Per-member balance shows User A owes 1,247 SEK but individual expenses sum to 1,246 SEK
- Users lose trust in the analytics ("the math is wrong")
- Cannot reconcile when settling up
- Multi-step calculations compound errors exponentially

**Prevention:**
1. **Store amounts with 2 decimal precision** (öre) consistently
2. **Use deterministic rounding** (e.g., banker's rounding, always round halves up)
3. **Apply rounding exactly once** at transaction creation, store rounded values
4. **Validate balance invariants:** Total expenses = Sum of all member shares (to the öre)
5. **Display rounding rules** explicitly: "Amounts rounded to nearest öre"
6. **Track residuals explicitly** if needed (e.g., "rounding adjustment" line item)

**Detection warning signs:**
- User reports "totals don't add up"
- Balance differences under 5 SEK but consistently present
- Re-calculating same date range produces different totals
- One member's balance is off by exactly 1 SEK after many transactions

**Phase implications:**
- **Phase 1 (Balance Tracking):** Must establish rounding rules before implementing
- Include balance validation tests: `assert totalExpenses === sumOfMemberShares`
- Consider adding "balance reconciliation" utility for debugging

**Sources:**
- [Splitwise: Rounding Calculation Issues](https://feedback.splitwise.com/forums/162446-general/suggestions/33733765--bug-splitting-expense-by-shares-calculation-isn)
- [Rounding Error in Accounting](https://www.enerpize.com/hub/rounding-error)
- [Swedish Krona Format](https://docs.codeblackbelt.com/article/1588-swedish-krona-sek-format)
- [Swedish Rounding (Wikipedia)](https://en.wikipedia.org/wiki/Swedish_krona)

---

### Pitfall 3: Category Budget Overspending State Confusion

**What goes wrong:** User spends 850 SEK against a 500 SEK budget. System shows either "350 SEK remaining" (negative) or "0 SEK remaining" (hiding overspending). Neither state accurately represents reality.

**Why it happens:**
- Budget state model doesn't account for "over budget" as a distinct state
- Calculations assume `remaining = budget - spent`, which goes negative
- UI conditionals check `remaining > 0` causing branching logic issues
- Overspending in one category doesn't affect other categories (no global constraint)
- No distinction between "soft limit" (warning) vs "hard limit" (block transaction)

**Consequences:**
- Users don't realize they're over budget until month-end
- Analytics show misleading "budget remaining" metrics
- Cannot answer "how much am I over budget total?" without manual calculation
- Budget alerts fire inconsistently (sometimes on approach, sometimes only after exceeded)

**Prevention:**
1. **Model budget states explicitly:** `under | approaching | exceeded`
2. **Calculate both remaining AND overspending:** `spent - budget` when exceeded
3. **Separate visual indicators:** Green (under), orange (approaching), red (exceeded)
4. **Define "approaching" threshold** (e.g., 80% of budget)
5. **Store overspending separately** for reporting: "350 SEK over budget"
6. **Consider flexible budgets** that can carry-over or reset monthly

**Detection warning signs:**
- Users ask "why didn't I get a warning before going over?"
- Budget UI shows 0% remaining instead of "150% spent"
- Cannot filter categories by "over budget" in analytics
- Month-end reports show negative percentages

**Phase implications:**
- **Phase 2 (Budget System):** Define state model before implementing UI
- Include overspending scenarios in acceptance tests
- Budget additional time for "budget alert" logic complexity

**Sources:**
- [BUDGT: Category Tracking with Color-Coded Feedback](https://www.budgt.ch/blog/how-to-track-your-spending-in-2026-complete-guide/)
- [Budget Category Design Best Practices](https://www.evolvingmoneycoaching.com/how-many-categories-should-you-have-in-your-budget-app-monarch-money/)
- [Handling Unexpected Expenses](https://www.finance-monthly.com/smarter-2026-budget/)

---

### Pitfall 4: Chart Drill-Down Performance Collapse

**What goes wrong:** Initial dashboard loads in 200ms, but clicking a category to drill down takes 8+ seconds and freezes the UI. Users think the app crashed.

**Why it happens:**
- Drill-down loads full year of detailed transactions (1000+ items) into memory
- Chart library re-renders entire SVG for each data point
- React re-renders entire component tree on date range change
- No data pagination or virtualization for large result sets
- Synchronous calculation blocks main thread

**Consequences:**
- Users avoid using drill-down features
- Browser becomes unresponsive during large queries
- High memory usage on mobile devices
- Poor perceived performance undermines trust in analytics

**Prevention:**
1. **Use Canvas/WebGL rendering** instead of SVG for large datasets (>500 points)
2. **Decimate data intelligently:** If showing 1 year on 400px chart, aggregate by day/week
3. **Implement pagination:** Load first 100 transactions, lazy-load rest
4. **Debounce date range changes** (300ms) to prevent rapid re-queries
5. **Use React.memo and useMemo** to prevent unnecessary chart re-renders
6. **Consider Web Workers** for heavy calculations (running totals, aggregations)
7. **Show loading states explicitly:** Progress indicators during drill-down

**Detection warning signs:**
- Users report "app freezes" when filtering
- Performance metrics show >2s Time to Interactive after interaction
- Console shows "Cannot update component while rendering" warnings
- Chrome DevTools shows long tasks (>50ms)

**Phase implications:**
- **Phase 3 (Chart Drill-Down):** Performance testing required before launch
- Load test with 1+ year of realistic data (50+ transactions/month)
- Budget time for performance optimization iteration

**Sources:**
- [React Chart Libraries Performance Comparison 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [MUI Charts: Bad Performance with Large Datasets](https://github.com/mui/mui-x/issues/12960)
- [Recharts Performance Guide](https://recharts.github.io/guide/performance/)
- [Chart.js Performance Optimization](https://www.chartjs.org/docs/latest/general/performance.html)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user confusion but are recoverable.

### Pitfall 5: Confusing Expense Tracking with Budgeting

**What goes wrong:** Team builds "expense history analytics" but calls it "budgeting," leading to user confusion about what the feature does.

**Why it happens:**
- Conflating expense tracking (looking backward) with budgeting (planning forward)
- Users expect budget features to help them **plan future spending**, not just report past spending
- Naming conventions blur the distinction ("Budget Dashboard" that only shows historical data)

**Prevention:**
- **Distinguish clearly:** Expense tracking = historical, Budgets = forward-looking
- **Separate UI sections:** "Expenses" vs "Budgets" vs "Projections"
- **Use correct terminology:** "Spent this month" (tracking) vs "Budget remaining" (planning)
- If not implementing true budgets yet, don't use "budget" in feature names

**Sources:**
- [YNAB: Expense Tracking Isn't Budgeting](https://www.ynab.com/blog/expense-tracking-isnt-budgeting)

---

### Pitfall 6: Partial Month Budget Calculation Errors

**What goes wrong:** User sets 1,500 SEK/month food budget on January 15. System charges full 1,500 SEK for January even though only half the month remains.

**Why it happens:**
- Assuming budgets always start on the 1st of the month
- Not prorating budgets when user changes mid-month
- Inconsistent calculation methods (30-day month vs actual days)
- Excluding start or end day from proration calculations

**Prevention:**
1. **Always use actual days in month** (28-31), not fixed 30
2. **Prorate when budget changes mid-month:** `dailyBudget * daysRemaining`
3. **Be explicit about proration:** Show "15 days remaining: 750 SEK" in UI
4. **Include both start and end days** in calculations
5. **Handle month transitions carefully:** December budget doesn't affect January

**Detection warning signs:**
- User reports "budget is wrong in the first month"
- February (28 days) has same budget as January (31 days)
- Changing budget on 15th doesn't update "remaining" amount

**Sources:**
- [How to Calculate Prorated Rent](https://www.offermarket.us/blog/how-to-calculate-prorate-rent)
- [Common Prorating Mistakes](https://www.apartmentlist.com/renter-life/prorated-rent)

---

### Pitfall 7: Hierarchy Drill-Down Too Deep or Illogical

**What goes wrong:** User clicks "Food" category → "Groceries" → "ICA" → "Dairy" → "Milk" → "Whole Milk" → "2026-01-15" (7 levels deep). They get lost and can't find their way back.

**Why it happens:**
- Over-engineering category hierarchies without considering user mental models
- No user testing on navigation paths
- Applying database normalization logic to UI navigation
- Missing breadcrumb trails or "back" functionality

**Prevention:**
1. **Limit drill-down to 3-5 levels maximum**
2. **Design hierarchies based on common user questions:** "What did I spend on food?" → Category → Individual transactions
3. **Provide breadcrumbs and "back to summary" shortcuts**
4. **Test with actual users** before finalizing hierarchy
5. **Surface key info at top level:** Don't hide critical data 4 levels deep

**Sources:**
- [Ultimate Guide to Drill Down Reports](https://improvado.io/blog/drill-down-reports-guide)
- [Dashboard UX Mistakes: Too Many Drill-Down Levels](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)

---

### Pitfall 8: Date Range State Management Causes Unnecessary Re-renders

**What goes wrong:** User types in date range start field. Every keystroke triggers full data refetch and chart re-render (6+ times while typing "2026-01-15").

**Why it happens:**
- Date range stored in global state that triggers cascade re-renders
- No debouncing on date input changes
- Chart components not memoized, re-render on any state change
- useEffect dependencies too broad, causing unnecessary queries

**Prevention:**
1. **Debounce date range changes** (300-500ms) before fetching data
2. **Use local state for input fields,** lift to global state on blur/submit
3. **Memoize expensive components:** Wrap charts in React.memo
4. **Use atomic state management** (Zustand, Jotai) to prevent full-tree re-renders
5. **Split state by frequency:** High-frequency (input text) stays local, low-frequency (selected range) goes global

**Sources:**
- [React State Management 2026: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025)
- [React Re-renders Guide](https://www.developerway.com/posts/react-re-renders-guide)
- [React Optimization 2026 Edition](https://medium.com/@muhammadshakir4152/react-js-optimization-every-react-developer-must-know-2026-edition-e1c098f55ee9)

---

### Pitfall 9: Budget Month-to-Month Carry-Over Confusion

**What goes wrong:** User underspends on groceries in January (saved 200 SEK). February budget resets to base amount—the savings vanish. User expected "rollover budget."

**Why it happens:**
- Two competing budget models: "Reset monthly" vs "Envelope/rollover"
- No explicit choice offered to user about which model to use
- Documentation doesn't clarify what happens to unused budget

**Prevention:**
1. **Choose a budget model explicitly:**
   - **Tracking Budget:** Resets monthly, no carry-over
   - **Envelope Budget:** Rolls over unused amounts
2. **Make the choice visible in UI:** "Your groceries budget resets each month"
3. **Allow category-level configuration** if needed (some rollover, others reset)
4. **Document behavior clearly** in help text

**Sources:**
- [Actual Budget: Tracking Budget Documentation](https://actualbudget.org/docs/getting-started/tracking-budget/)
- [Tiller: Free Google Sheets Budget Templates](https://tiller.com/free-google-sheets-budget-templates/)

---

## Minor Pitfalls

Mistakes that cause annoyance or slight UX degradation but are easily fixed.

### Pitfall 10: Swedish Currency Formatting Inconsistency

**What goes wrong:** System shows "1234.56 kr" but Swedish format is "1 234,56 kr" (space thousands separator, comma decimal).

**Prevention:**
- Use Swedish locale formatting: `new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })`
- Format: `1 234,56 kr` (space as thousands separator, comma as decimal)
- Symbol placement: **after** the amount with non-breaking space

**Sources:**
- [Sweden Formatting Standards](https://www.freeformatter.com/sweden-standards-code-snippets.html)
- [Swedish Krona Format](https://docs.codeblackbelt.com/article/1588-swedish-krona-sek-format)

---

### Pitfall 11: Missing Contextual Explanations in Analytics

**What goes wrong:** Chart shows "You'll exceed your budget by March 15" but doesn't explain why. Users don't trust the prediction.

**Prevention:**
- Add tooltips explaining calculations: "Based on your average spending of 1,200 SEK/week"
- Show confidence levels if using projections: "Prediction accuracy: 75%"
- Provide "Why this number?" explanations for derived metrics

**Sources:**
- [AI Dashboard UX Mistakes: Lack of Contextual Explanations](https://hogoco.com/common-ux-mistakes-in-ai-dashboards/)

---

### Pitfall 12: Not Surfacing Key Information at Top Level

**What goes wrong:** User must drill down 3 levels to see "You're over budget on Food." The top-level dashboard shows only "healthy green" status.

**Prevention:**
- **Surface critical alerts at top level:** "⚠️ 3 categories over budget"
- **Use progressive disclosure:** Summary → Details → Transactions
- **Highlight actionable insights** prominently, not buried in drill-downs

**Sources:**
- [Dashboard Design: Not Surfacing Key Information](https://ergomania-ux.medium.com/dashboard-creation-for-ux-designers-202dba5d428e)

---

### Pitfall 13: Excessive White Space Forcing Scrolling

**What goes wrong:** Dashboard requires 3 full-page scrolls to see 4 KPI cards because of massive padding/margins.

**Prevention:**
- **Dashboard design principle:** Efficiency over aesthetics
- Show key metrics "above the fold" on typical screens
- Use compact layouts for data-dense views
- Test on realistic screen sizes (laptop 1920x1080, mobile)

**Sources:**
- [UX Design Mistakes: Excessive White Space](https://medium.com/design-led/6-ux-design-mistakes-to-avoid-when-designing-dashboards-9513ca13978a)

---

### Pitfall 14: Data Inconsistencies Between Summary and Drill-Down

**What goes wrong:** Summary shows "Food: 1,500 SEK" but drilling down and summing transactions gives 1,485 SEK.

**Prevention:**
- **Use same query logic for summary and detail views**
- Validate: Summary total === Sum of drill-down items
- If using cached summaries, invalidate on data changes
- Test specifically for this scenario in QA

**Sources:**
- [Drill Down Reports: Data Inconsistencies](https://improvado.io/blog/drill-down-reports-guide)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Date Range Filtering** | DST edge cases (Critical #1) | Test with DST transition dates, store timestamps in UTC |
| **Phase 1: Balance Tracking** | Rounding errors (Critical #2) | Establish deterministic rounding, validate balance invariants |
| **Phase 2: Budget System** | Overspending state confusion (Critical #3) | Model budget states explicitly, define alert thresholds |
| **Phase 2: Budget System** | Partial month calculations (Moderate #6) | Prorate budgets on mid-month changes, use actual days in month |
| **Phase 2: Budget System** | Carry-over confusion (Moderate #9) | Choose budget model explicitly, document behavior clearly |
| **Phase 3: Chart Drill-Down** | Performance collapse (Critical #4) | Use Canvas rendering, decimate data, load test with realistic data |
| **Phase 3: Chart Drill-Down** | Too-deep hierarchy (Moderate #7) | Limit to 3-5 levels, test with users |
| **Phase 3: Chart Drill-Down** | Date range re-renders (Moderate #8) | Debounce input changes, memoize chart components |
| **All Phases** | Swedish formatting (Minor #10) | Use sv-SE locale consistently |
| **All Phases** | Terminology confusion (Moderate #5) | Distinguish expense tracking from budgeting in naming |

---

## Testing Checklist for Pitfall Prevention

### Date & Time Testing
- [ ] Test with DST transition dates: March 29 and October 25, 2026
- [ ] Test with month boundaries (Jan 31 → Feb 1)
- [ ] Test with leap year dates if applicable
- [ ] Test date ranges spanning multiple timezone offsets

### Currency & Balance Testing
- [ ] Test with odd-amount splits (e.g., 49 SEK ÷ 2)
- [ ] Validate: Total expenses === Sum of member shares
- [ ] Test with 100+ transactions, check for rounding drift
- [ ] Test Swedish currency formatting in all displays

### Budget Testing
- [ ] Test budget creation mid-month (proration)
- [ ] Test spending exactly at budget limit
- [ ] Test overspending scenarios (110%, 200%)
- [ ] Test month-to-month transitions (rollover or reset)
- [ ] Test with zero-budget categories

### Performance Testing
- [ ] Test drill-down with 1000+ transactions
- [ ] Test date range changes with debouncing
- [ ] Monitor re-render counts (React DevTools Profiler)
- [ ] Test on mobile devices with limited memory

### UX Testing
- [ ] Test drill-down navigation (can user find their way back?)
- [ ] Test with color-blind users (don't rely only on color for budget status)
- [ ] Test all error states (no data, over budget, calculation errors)
- [ ] Test with screen readers (accessibility)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Date/Timezone pitfalls | HIGH | Well-documented in timezone libraries, DST dates confirmed for Sweden 2026 |
| Currency rounding | HIGH | Swedish rounding rules documented, expense splitting issues well-known |
| Budget state management | MEDIUM | Based on existing budget app patterns, but implementation details vary |
| Chart performance | HIGH | React chart library performance issues well-documented with solutions |
| UX drill-down patterns | MEDIUM | Dashboard UX best practices established, but user testing still needed |

---

## Summary

**Most Critical Pitfalls to Prevent:**

1. **DST edge cases** (Phase 1) - Will cause data integrity issues that are hard to debug later
2. **Rounding errors** (Phase 1) - Erodes user trust if balances don't add up
3. **Budget overspending state** (Phase 2) - Core to budget feature usability
4. **Chart performance** (Phase 3) - Poor performance undermines entire analytics feature

**Recommended Risk Mitigation Strategy:**

- **Phase 1:** Allocate 30% extra time for DST and rounding edge case testing
- **Phase 2:** Define budget model and state machine before coding
- **Phase 3:** Load test with 1+ year realistic data before feature launch
- **All phases:** Write integration tests covering edge cases, not just happy path

**Open Questions for Further Investigation:**

- Should budgets support custom periods (bi-weekly, quarterly) or monthly only?
- Should the app support multiple currencies for international users, or Swedish Kronor only?
- Should balance tracking support partial splits (e.g., 60/40) or only 50/50?
