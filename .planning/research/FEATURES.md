# Feature Landscape: Analytics Cockpit

**Domain:** Personal finance analytics dashboard (couples/roommates)
**Researched:** 2026-01-27
**Context:** Adding analytics cockpit to existing expense tracking app

## Executive Summary

Analytics dashboards for household expense tracking have well-established UX patterns. Users expect flexible date filtering with presets, clear KPI comparisons with trend indicators, and visual budget progress. For couple/roommate apps specifically, balance calculation with debt simplification is table stakes. The research reveals clear patterns for drill-down interactions, empty states, and mobile touch considerations.

**Confidence:** HIGH for core patterns (date pickers, KPI cards, balance tracking), MEDIUM for budget thresholds (common patterns exist but specific percentages vary by app).

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Date range presets** | Industry standard in all analytics dashboards | Low | "This month", "Last 30 days", "This quarter", "YTD", "Last year" |
| **Start/end date picker** | Users need custom ranges beyond presets | Medium | Single calendar view showing both dates, highlight selected range |
| **KPI trend indicators** | Users need to know if things are improving or worsening | Low | ▲/▼ arrows with percentage change, colored by direction |
| **MoM comparison** | Short-term trend visibility is essential for monthly budgeting | Medium | "(Current - Previous) / Previous × 100" with arrow |
| **Balance simplification** | Minimize number of payments needed to settle | High | Debt shuffling algorithm (Splitwise pattern) |
| **Who owes whom display** | Users must know settlement amount without calculation | Low | Clear "Anna owes Bob 500 kr" format |
| **Budget progress bars** | Visual representation of spending vs limit | Low | Horizontal bar with percentage, color-coded |
| **Category breakdown** | Users need to see where money is going | Medium | Donut chart + list, both interactive |
| **Clickable KPI drill-down** | Users want to explore what contributes to a metric | Medium | Click Income KPI → see income transactions |
| **Empty states with guidance** | First-time users or filtered-to-zero need direction | Low | "No expenses this period" + suggestion to expand range |
| **Responsive/mobile design** | Personal finance is mobile-first usage | High | 44px touch targets, bottom sheets for filters, drag selection |

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **URL deep linking** | Share specific view/date range with household partner | Low | Query params: `?tab=categories&start=2026-01&end=2026-01&member=anna` |
| **Date range persistence** | Users don't want to reselect range every session | Low | LocalStorage or URL params |
| **Multi-threshold budget alerts** | Progressive warnings (70%/90%/100%) vs binary | Low | Color progression: green → yellow → orange → red |
| **Drag-to-select date range** | Faster than clicking start then end on mobile | Medium | Touch-friendly calendar with drag gesture |
| **Shared/Personal/Mixed toggle** | Couples need to see joint vs individual spending | Medium | Filter affects all visualizations, not just one chart |
| **YoY comparison** | Long-term trend visibility (not just MoM) | Low | Show same month last year for seasonality awareness |
| **Donut slice multi-select** | Filter to multiple categories at once | Medium | CTRL+click pattern, show "2 categories selected" |
| **Celebratory empty states** | Positive reinforcement when budget goals met | Low | "You're under budget! 🎉" instead of generic empty |
| **Income-based split option** | Fair Share Calculator pattern for unequal incomes | High | Alternative to 50/50, uses household income ratio |
| **Savings rate KPI** | Shows financial health beyond income/expense/net | Low | (Net / Income) × 100, with trend arrow |
| **Budget forecast** | "At current pace, you'll exceed by X kr" | Medium | Linear projection based on days remaining |
| **Transaction count in KPIs** | Context for averages: "12 expenses, avg 450 kr" | Low | Helps explain why number changed |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Too many date presets** | Clutters UI, decision fatigue | 5-7 presets max: This month, Last 30d, This quarter, YTD, Last year, All time |
| **Auto-refresh without indicator** | Users get disoriented when numbers change | Show "Updated 2 seconds ago" badge or disable auto-refresh |
| **Decimal percentages in UI** | 12.47% is false precision for household budgets | Round to whole numbers: 12% or 12.5% max |
| **Plain "No data" message** | Feels broken, not informative | Always explain: "No expenses in this date range. Try expanding the range or adding expenses." |
| **Budget alerts without context** | "You're over budget" is unhelpful without details | "Groceries: 3,200 kr of 2,500 kr (128%)" |
| **Non-simplified debt** | Showing all pairwise debts is confusing | Always simplify: If A→B→C chain exists, show A→C |
| **Forced equal splits** | Couples with income disparity need flexibility | Offer 50/50 default, income-based option, custom ratio |
| **Desktop-only date pickers** | Finance apps are mobile-heavy usage | Use touch-friendly, mobile-first date components |
| **Drill-down without breadcrumbs** | Users get lost in hierarchy | Show "Overview → Groceries → Transactions" trail |
| **Budget overrun panic design** | Red everywhere creates stress | Use orange for warning (80-100%), red only for exceeded (>100%) |
| **Calendar starting on Monday** | Swedish users expect Monday start (ISO 8601) | Use locale-aware calendar (sv-SE) |
| **Overly complex debt algorithm** | Perfect optimization is NP-complete, overkill | Greedy algorithm sufficient: Match largest giver to largest receiver |

---

## Feature Dependencies

```
Date Range Selection
  └── All Analytics Views (dependent on date filter)
       ├── KPI Cards
       │    ├── Trend Indicators (requires previous period for comparison)
       │    └── Drill-Down Detail Views
       ├── Category Breakdown
       │    └── Interactive Filtering (click slice → filter transactions)
       ├── Member Balance
       │    └── Settlement Calculation (who owes whom)
       └── Budget Progress
            └── Threshold Warnings (requires budget limits)

Expense/Income Data
  └── Shared/Personal Toggle (filters all views)
       └── Balance Calculation (only shared expenses affect balance)
```

**Build Order Recommendation:**
1. Date range selection (foundational for all else)
2. KPI cards with MoM comparison (quick wins, high value)
3. Category breakdown with drill-down (leverage existing donut chart)
4. Member balance tracking (new feature, high value for couples)
5. Budget progress (requires new table, but straightforward UI)
6. Advanced features (YoY, forecast, multi-select)

---

## Concrete Patterns

### Date Range Picker

**Layout:**
- Preset buttons above calendar: [This Month] [Last 30 Days] [This Quarter] [YTD] [Last Year]
- Single calendar view showing start and end dates
- Highlight selected range with background color
- Show selected range as text: "1 Jan 2026 - 27 Jan 2026"

**Mobile behavior:**
- Touch-friendly: 44px minimum touch target for date cells
- Drag-to-select: Touch start date, drag to end date
- Bottom sheet modal on mobile (avoid small popover)
- "Apply" button to confirm selection

**Apply button logic:**
- NOT needed for date-only range picker
- Needed if you add time or timezone selection
- Can use immediate application for faster UX

**Example preset calculations:**
```typescript
const presets = {
  thisMonth: { start: startOfMonth(today), end: today },
  last30Days: { start: subDays(today, 30), end: today },
  thisQuarter: { start: startOfQuarter(today), end: today },
  ytd: { start: startOfYear(today), end: today },
  lastYear: { start: startOfYear(subYears(today, 1)), end: endOfYear(subYears(today, 1)) },
}
```

### KPI Cards with Trend Indicators

**Visual structure:**
```
┌─────────────────────────┐
│ EXPENSES                │
│ 12,450 kr    ▲ 8%      │  ← Arrow + percentage
│ vs last month           │  ← Comparison period
│ (12 transactions)       │  ← Context (differentiator)
└─────────────────────────┘
```

**Arrow logic:**
```typescript
const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '—'
const color =
  metric === 'expenses' ? (change > 0 ? 'red' : 'green') : // Bad if expenses up
  metric === 'income' ? (change > 0 ? 'green' : 'red') :   // Good if income up
  'neutral'
```

**Percentage calculation:**
```typescript
const percentChange = ((current - previous) / previous) * 100
const display = `${arrow} ${Math.abs(Math.round(percentChange))}%`
```

**Drill-down interaction:**
- Card is clickable (cursor: pointer)
- Click → Navigate to detail view filtered to that metric
- Example: Click "Expenses 12,450 kr" → Shows list of all expenses in date range

### Balance Tracking & Settlement

**Debt simplification algorithm (Splitwise pattern):**

1. Calculate net position for each person:
   ```typescript
   // Anna paid 1000 kr for shared groceries, Bob paid 300 kr for shared dinner
   // Split is 50/50
   const balance = {
     Anna: +1000 - 650 = +350,  // Anna is owed 350
     Bob: +300 - 650 = -350     // Bob owes 350
   }
   ```

2. Match givers to receivers:
   ```typescript
   const givers = Object.entries(balance).filter(([_, amt]) => amt < 0)  // Who owes
   const receivers = Object.entries(balance).filter(([_, amt]) => amt > 0) // Who is owed

   // Greedy match: Largest debt to largest credit
   settlements = matchLargestToLargest(givers, receivers)
   // Result: "Bob owes Anna 350 kr"
   ```

**Visual display:**
```
┌─────────────────────────┐
│ BALANCE                 │
│                         │
│ Bob owes Anna           │
│ 350 kr                  │  ← Large, prominent
│                         │
│ [Settle Up]             │  ← CTA for marking paid
└─────────────────────────┘
```

**When balanced:**
```
┌─────────────────────────┐
│ BALANCE                 │
│                         │
│ ✓ All settled up!       │  ← Celebratory empty state
│ You're both even.       │
└─────────────────────────┘
```

### Budget Progress Bars

**Visual structure:**
```
Groceries                           2,340 kr / 2,500 kr (94%)
[████████████████████░░] ← Orange color at 94%

Transport                           450 kr / 1,000 kr (45%)
[████████░░░░░░░░░░░░░░] ← Green color at 45%

Entertainment                       1,250 kr / 800 kr (156%)
[████████████████████████] ← Red, bar extends past 100%
+450 kr over
```

**Threshold colors:**
```typescript
const getColor = (percentage: number) => {
  if (percentage < 70) return 'green'
  if (percentage < 90) return 'yellow'
  if (percentage < 100) return 'orange'
  return 'red'
}
```

**Progressive alerts:**
- 70%: Soft warning (yellow), "You've used 70% of your grocery budget"
- 90%: Strong warning (orange), "You're at 90% of your grocery budget"
- 100%: Over budget (red), "You've exceeded your grocery budget by 250 kr"

**Forecast (differentiator):**
```typescript
const daysInPeriod = differenceInDays(endDate, startDate)
const daysElapsed = differenceInDays(today, startDate)
const daysRemaining = daysInPeriod - daysElapsed
const dailyRate = spent / daysElapsed
const projectedTotal = dailyRate * daysInPeriod

if (projectedTotal > budget) {
  const overage = projectedTotal - budget
  message = `At current pace, you'll exceed by ${overage} kr`
}
```

### Shared vs Personal Toggle

**UI placement:**
- Top of analytics view, next to date range picker
- Segmented control: [All] [Shared] [Personal]
- Default: All
- Persists in localStorage or URL param

**Filter behavior:**
```typescript
const filterTransactions = (transactions, filter) => {
  if (filter === 'all') return transactions
  if (filter === 'shared') return transactions.filter(t => t.isShared === true)
  if (filter === 'personal') return transactions.filter(t => t.isShared === false)
}
```

**Impact on balance:**
- Balance calculation ONLY considers shared expenses
- Personal expenses don't affect who-owes-whom
- If Personal filter active, hide Balance card entirely (not applicable)

### Empty States

**Structure: Inform + Inspire + Activate**

**First-use (no data yet):**
```
┌─────────────────────────┐
│  [Icon: Chart]          │
│                         │
│  No expenses yet        │  ← Inform
│                         │
│  Track your spending to │  ← Inspire
│  see insights here      │
│                         │
│  [Add Expense]          │  ← Activate
└─────────────────────────┘
```

**Filtered to zero:**
```
┌─────────────────────────┐
│  No expenses in         │  ← Inform
│  January 2026           │
│                         │
│  Try expanding the date │  ← Activate
│  range or adding an     │
│  expense for this month │
└─────────────────────────┘
```

**Success state (all caught up):**
```
┌─────────────────────────┐
│  ✓ All caught up!       │  ← Celebratory
│                         │
│  You've reviewed all    │
│  expenses this period   │
└─────────────────────────┘
```

---

## Implementation Priorities

### MVP (Must Ship)
1. Date range picker with 5 presets
2. KPI cards with ▲/▼ arrows and MoM comparison
3. Basic drill-down (click KPI → transaction list)
4. Member balance with debt simplification
5. Category budget progress bars with threshold colors
6. Shared/Personal toggle affecting all views
7. Basic empty states ("No data in this range")

### Post-MVP (Nice to Have)
1. YoY comparison toggle
2. Budget forecast at current pace
3. Celebratory empty states
4. Multi-select on donut chart (CTRL+click)
5. Income-based split option
6. Transaction count in KPIs
7. Drag-to-select date ranges
8. URL deep linking with query params

### Future Consideration
1. Custom split ratios (not just 50/50 or income-based)
2. Budget templates ("Typical Swedish household")
3. Recurring budget adjustments (seasonal)
4. AI-powered anomaly detection ("You spent 3x normal on groceries")
5. Multi-household support (shared with multiple roommates)

---

## Mobile-Specific Considerations

| Concern | Pattern | Implementation |
|---------|---------|---------------|
| **Touch targets** | Minimum 44px × 44px | Date cells, filter buttons, KPI cards |
| **Date picker** | Bottom sheet modal | Full-screen on mobile, popover on desktop |
| **Range selection** | Drag gesture | Touch start date, drag to end, release |
| **Filter controls** | Sticky header | Date range + toggle stays visible on scroll |
| **Charts** | Touch interactions | Tap donut slice (no hover), swipe between views |
| **Drill-down** | Slide transition | Feels like navigation, not disorienting |
| **Budget bars** | Vertical on mobile | Horizontal on desktop (more space) |
| **Balance card** | Prominent CTA | "Settle Up" button is large, easy to tap |

---

## Accessibility Notes

- Arrows must have text labels for screen readers: `<span aria-label="increased by">▲</span>`
- Budget colors cannot be only indicator: Include text "Over budget" not just red bar
- Date picker must support keyboard navigation (Tab, Arrow keys, Enter)
- Empty states need descriptive text, not just icons
- Drill-down must be achievable via keyboard (not just click)

---

## Sources

### Date Range Patterns
- [Time Picker UX: Best Practices, Patterns & Trends for 2025](https://www.eleken.co/blog-posts/time-picker-ux)
- [How to design an effective date picker UI?](https://cieden.com/book/atoms/date-picker/date-picker-ui)
- [The Most Popular Date Filter UI Patterns](https://evolvingweb.com/blog/most-popular-date-filter-ui-patterns-and-how-decide-each-one)
- [React Date Range Picker component - MUI X](https://mui.com/x/react-date-pickers/date-range-picker/)
- [Date-time range picker for desktop & mobile | Mobiscroll](https://demo.mobiscroll.com/range)

### Balance & Expense Splitting
- [Split expenses with friends. :: Splitwise](https://www.splitwise.com/)
- [Algorithm Behind Splitwise's Debt Simplification Feature](https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688)
- [What does the "simplify debts" setting do? – Splitwise](https://feedback.splitwise.com/knowledgebase/articles/107220-what-does-the-simplify-debts-setting-do)
- [Income-Based Bill Split Calculator - Fair Share Calculator](https://www.fairsharecalculator.com/)
- [How to Split Expenses With Your Partner](https://www.ellevest.com/magazine/split-expenses)

### Budget Visualization
- [Best Dashboard Design Examples & Inspirations for 2026 | Muzli Blog](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)
- [Budget Alerts - Infracost](https://www.infracost.io/glossary/budget-alerts/)
- [Budget vs. Actual Dashboard | ClearPoint Strategy](https://www.clearpointstrategy.com/dashboards/budget-vs-actual-dashboard)

### KPI & Drill-Down Patterns
- [What is a KPI Dashboard? Complete Guide 2026](https://improvado.io/blog/kpi-dashboard)
- [How to Create a KPI Card (with Two Tricks for Showing % Change)](https://www.flerlagetwins.com/2025/09/how-to-create-kpi-card-with-two-tricks.html)
- [Drill In and Out of a KPI Visualization](https://www2.microstrategy.com/producthelp/Current/MSTRWeb/WebHelp/Lang_1033/Content/drill_kpi.htm)
- [Adding Up and Down Arrows to KPIs in Power BI | phData](https://www.phdata.io/blog/adding-up-and-down-arrows-in-power-bi/)

### Shared/Personal Toggle
- [How to Decide If an Expense Is Shared or Personal Using a Simple Flowchart | Monee](https://monee-app.com/blog/how-to-decide-if-an-expense-is-shared-or-personal-using-a-simple-flowchart/)
- [Top Free Personal Finance Software in 2025](https://use.expensify.com/resource-center/guides/free-personal-finance-software)
- [Recent Spending | Beyond Budget](https://www.beyondbudgetapp.com/accounts/recent-spending)

### Empty States
- [Empty state UX examples and design rules that actually work](https://www.eleken.co/blog-posts/empty-state-ux)
- [Empty State UX Examples & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/empty-states)
- [Empty States: From Blank Screen to Opportunity](https://infodation.com/en/blogs/empty-states-from-blank-screen-to-opportunity)

---

*Research completed: 2026-01-27*
*Confidence: HIGH for core patterns, MEDIUM for budget thresholds*
*Ready for requirements definition.*
