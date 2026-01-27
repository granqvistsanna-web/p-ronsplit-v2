# Feature Landscape: Personal Finance Analytics Dashboard

**Domain:** Household expense splitting app analytics (2-person household)
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Personal finance analytics dashboards in 2026 have evolved from passive transaction viewers to proactive decision-making tools. The market divides into two camps: **reactive trackers** (showing where money went) like Mint and **proactive budgeters** (planning where money should go) like YNAB. For a 2-person household splitting expenses, the winning pattern combines reactive insights (spending patterns, category breakdowns) with proactive controls (budgets, pacing alerts).

The table stakes have risen significantly. Users now expect automated categorization, visual drill-downs, and comparison views as baseline. Differentiators focus on reducing cognitive load through smart defaults, actionable insights over raw data, and frictionless sharing between household members.

## Table Stakes

Features users expect. Missing these = product feels incomplete or frustrating.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Time filtering with presets** | Every competitor has "Last 30 days", "This month", "YTD" shortcuts | LOW | Typing dates is friction. Presets are productivity boosters. Include: Today, This week, This month, Last month, Last 30 days, YTD, Last 3/6/12 months |
| **Category breakdown visualization** | Core value proposition — "see where money goes" | LOW | Bar/donut charts expected. Users click segments to drill deeper |
| **Drill-down without navigation** | Users want detail without losing context | MEDIUM | Side panel (desktop) or bottom sheet (mobile) pattern is standard. Full page navigation breaks flow |
| **Budget vs actual comparison** | Primary use case for analytics is "am I on track?" | MEDIUM | Progress bars with color-coded status (green/yellow/red) are universal pattern |
| **Trend over time** | Spotting patterns requires historical view | LOW | Line chart with 3-6 months is baseline. Already exists in Päronsplit |
| **Category-level detail** | Need to see transactions grouped by category, not just totals | LOW | Expandable lists with transaction details. Already exists in Päronsplit |
| **Quick balance visibility** | Users need to know "how much can I spend?" ASAP | LOW | KPI cards at top showing income/expenses/net. Already exists in Päronsplit |
| **Mobile-optimized interactions** | >50% users access on mobile | MEDIUM | Touch targets 44px+, bottom sheets, swipe gestures for drill-down |
| **Currency formatting** | Locale-appropriate formatting (Swedish krona with sv-SE) | LOW | Already handled in Päronsplit |

## Differentiators

Features that set products apart. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Deep linking for shared views** | "Look at our grocery spending this month" — send exact view to household partner | LOW | URL query params. Critical for 2-person household collaboration |
| **Pacing insights** | "You're 60% through budget but only 40% through month" — proactive vs reactive | MEDIUM | Calculates (days elapsed / days in period) vs (spent / budget). High impact insight |
| **Filter state persistence** | Remember user's preferred view (per user, not shared) | LOW | localStorage per user. Reduces repeated selections |
| **Smart budget suggestions** | "Use last 3 months average" instead of forcing manual entry | MEDIUM | Reduces setup friction. Huge onboarding improvement |
| **Stacked breakdown by member** | See who contributed to each category in household | MEDIUM | Unique to shared household context. Answers "who spent what on groceries?" |
| **"Other" bucket for small categories** | Collapse categories <3% into "Other" to reduce clutter | LOW | Reduces cognitive load. Standard in modern dashboards |
| **Comparison overlays** | Toggle previous period onto current chart | MEDIUM | "This month vs last month" visual comparison reduces mental math |
| **Top N control for categories** | Default show 8, option for "show all" | LOW | Balances "at a glance" with "comprehensive detail" |
| **Empty state guidance** | When no data, suggest actions instead of blank screen | LOW | "No expenses yet. Add your first transaction" with CTA |
| **Reset filter visibility** | Show "Reset" link only when filters deviate from default | LOW | Reduces UI clutter while providing escape hatch |
| **Status-based progress coloring** | Neutral (<80%), warning (80-100%), error (>100%) | LOW | Visual health check without reading numbers |

## Anti-Features

Features to explicitly NOT build. Common mistakes in personal finance apps that frustrate users.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Custom date range calendar picker** | Adds complexity, rarely used. Users stick to presets | Use preset buttons only. "Last 30 days" covers 90% of custom range use cases |
| **Too many KPIs (>7-10)** | Cognitive overload. Users can't process 15 metrics at once | Prioritize 3-5 KPIs per view. Keep it "glanceable" |
| **Account linking/sync with bank** | For 2-person household app, adds massive complexity, security concerns, trust friction | Manual transaction entry already established. Don't fight that model |
| **Credit score tracking** | Scope creep. Not core to expense splitting | Focus on spending/budget tracking only |
| **Investment portfolio tracking** | Different mental model than expense tracking | Keep focused on expenses. Don't become "all things finance" |
| **Gamification/badges** | Often feels gimmicky in finance context | Real insights are more motivating than fake achievements |
| **AI chatbot for financial advice** | Regulatory concerns, unrealistic expectations, maintenance burden | Provide clear data visualization instead. Let users draw conclusions |
| **Forced onboarding quiz** | Friction before value. Users abandon | Progressive disclosure. Show value first, gather preferences later |
| **Hidden balance information** | Users need balance ASAP (e.g., at store checkout) | Put key metrics at top, no scroll required |
| **Too many drill-down levels** | "Pogo stick navigation" — down, up, down again. Exhausting | Max 2 levels: Overview → Category detail. Use filters, not navigation |
| **Complex jargon** | "Invoicing" vs "Billing" — don't assume financial literacy | Use everyday language. "Total" not "Aggregate" |
| **Auto-categorization without override** | AI misses context. User knows "Groceries" was actually "Party supplies" | Allow manual re-categorization. Trust user over algorithm |

## Feature Dependencies

```
Filter Bar (Foundation)
  ↓
├─ Category Breakdown Charts (reads filter state)
│   ↓
│   └─ Drill-Down Panel (shows filtered category transactions)
│
├─ Budget Tracking (reads filter state)
│   ↓
│   └─ Pacing Insights (requires budget + date range + current day)
│
└─ Comparison Overlay (requires "previous period" calculation from current filter)

Deep Linking
  ↓
  └─ Filter Bar (URL params → filter state → UI update)

Filter Persistence
  ↓
  └─ Filter Bar (localStorage → filter state on mount)
```

## MVP Recommendation

For Päronsplit's analytics enhancement (subsequent milestone), prioritize:

### Phase 1: Foundation (Week 1)
1. **Persistent filter bar with presets** — Everything depends on this
2. **Deep linking via URL params** — Core value for household sharing
3. **Filter state persistence** — Reduces friction for returning users

### Phase 2: Category Insights (Week 2)
4. **Category bar chart with Top N control** — Primary "where money goes" view
5. **Stacked mode per member** — Unique to household context
6. **Drill-down side panel/bottom sheet** — Detail without navigation loss
7. **"Other" bucket for small categories** — Reduces clutter

### Phase 3: Budget Tracking (Week 3)
8. **Budget setup per category** — Core proactive feature
9. **"Use last 3 months average" suggestion** — Reduces setup friction
10. **Budget vs actual progress bars** — Visual health check
11. **Pacing insights** — Proactive alert ("on track" vs "over pace")

### Phase 4: Polish (Week 4)
12. **Comparison toggle** — Previous period overlay
13. **Status-based coloring** — Neutral/warning/error states
14. **Reset link** — When filters active
15. **Empty/loading/error states** — Production readiness

Defer to post-MVP:
- **Overview daily spend line chart** — Nice to have, but categories + budgets are higher priority
- **Members analytics tab** — "Who spends more" is interesting but less actionable
- **Custom date range** — Presets cover 90% of use cases
- **Interactive legend** — Complexity vs value tradeoff

## Rationale: Table Stakes vs Differentiators

### Why Date Presets are Table Stakes
Every major app (YNAB, Mint, Monarch, Zeta) uses preset buttons. Users expect them. Without presets, users must type dates or navigate calendar widgets — pure friction with no upside.

### Why Deep Linking is a Differentiator
Most solo budgeting apps don't need this. But for 2-person household: "Hey, look at our restaurant spending last month!" → send link → partner opens exact view. Huge collaboration win. Competitors like Zeta have "Memos" on transactions, but not full view sharing.

### Why Pacing Insights are a Differentiator
This shifts from reactive ("I spent 110% of budget... oops") to proactive ("I'm 60% through budget with 15 days left — slow down"). YNAB has "Age of Money", Monarch has forecasting, but simple pacing insight is rare and highly actionable.

### Why Account Linking is an Anti-Feature (for this app)
Mint/YNAB/Monarch all auto-sync with banks. But Päronsplit is a **household splitting** app where users *already* manually enter shared expenses. Adding bank sync would:
1. Require OAuth integrations (complex, security concerns)
2. Import *all* transactions (not just shared household expenses)
3. Create trust barrier ("why does it need my bank password?")
4. Duplicate UX model (manual entry already established)

Don't fight the existing mental model. Lean into manual entry strengths.

## Context: 2-Person Household vs Solo Finance

Key differences for household expense splitting:

| Dimension | Solo Finance App | 2-Person Household App |
|-----------|------------------|------------------------|
| **Primary question** | "Where did *I* spend?" | "Where did *we* spend?" + "Who paid?" |
| **Sharing** | Not needed | Critical (deep linking, view state) |
| **Categorization** | User's mental model | Shared mental model (agreement on categories) |
| **Budget tracking** | Individual accountability | Joint accountability + fairness tracking |
| **Member breakdown** | N/A | Who contributed to shared expenses? |
| **Data entry** | Can auto-sync (only one bank) | Manual shared expense entry (two people, selective) |

Päronsplit sits in unique position: **household analytics, not personal finance**. This means:
- ✓ Stacked charts by member = differentiator
- ✓ Deep linking for view sharing = differentiator
- ✗ Credit score = not relevant
- ✗ Investment tracking = out of scope

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Table stakes | HIGH | Verified across 10+ competitor products (YNAB, Mint, Monarch, Zeta, Honeydue) via web search |
| Differentiators | MEDIUM-HIGH | Patterns from competitor analysis + UX case studies. Pacing insight is novel but logical |
| Anti-features | HIGH | Sourced from UX case studies documenting user frustrations, fintech UX best practices |
| 2-person household context | MEDIUM | Limited specific research on household splitting apps. Extrapolated from couples budgeting apps (Honeydue, Zeta) |
| UI patterns | HIGH | Date presets, drill-down patterns, progress bars verified across multiple design systems and BI tools |

## Sources

**Competitor Analysis:**
- [YNAB vs Mint Comparison | Moneywise](https://moneywise.com/managing-money/budgeting/mint-vs-ynab)
- [YNAB vs. Mint: Which Budgeting App Is Best? | GoBankingRates](https://www.gobankingrates.com/saving-money/budgeting/ynab-vs-mint/)
- [Best Budgeting Apps For Families 2026 | Family Money Adventure](https://familymoneyadventure.com/best-family-budgeting-apps/)
- [Best budgeting apps of 2026 | CNBC Select](https://www.cnbc.com/select/best-budgeting-apps/)

**Dashboard Best Practices:**
- [Financial Dashboard Examples & Templates | Qlik](https://www.qlik.com/us/dashboard-examples/financial-dashboards)
- [Power BI Financial Dashboards Guide 2026 | ZebraBI](https://zebrabi.com/power-bi-financial-dashboards/)
- [Finance Dashboard Design Best Practices | F9 Finance](https://www.f9finance.com/dashboard-design-best-practices/)
- [Expense Tracker Apps 2026 | Expensify](https://use.expensify.com/blog/personal-expense-tracker-apps)

**UI/UX Patterns:**
- [Date Range Filtering with Presets | Mobiscroll](https://demo.mobiscroll.com/range/date-filtering-with-predefined-ranges)
- [The Most Popular Date Filter UI Patterns | Evolving Web](https://evolvingweb.com/blog/most-popular-date-filter-ui-patterns-and-how-decide-each-one)
- [Drill Down Reports Guide | Improvado](https://improvado.io/blog/drill-down-reports-guide)
- [Dashboard Design Inspiration | Design4Users](https://design4users.com/dashboard-design-concepts/)

**UX Anti-Patterns:**
- [Fintech App Design: Top 20 Financial UX Issues | UXDA](https://theuxda.com/blog/top-20-financial-ux-dos-and-donts-to-boost-customer-experience)
- [UX Case Study: Budgeting Mobile App | Vivian Lim](https://medium.com/@vivianlimsq/ux-case-study-budgeting-mobile-app-for-beginners-a6d2e920986b)
- [Fintech App: 5 UX Challenges | Adam Fard Studio](https://adamfard.com/blog/finance-app-design)
- [How to Start With Budget App Design | Eleken](https://www.eleken.co/blog-posts/budget-app-design)

**Household/Shared Budgeting:**
- [Top Budgeting Apps 2026 | The Year 2026](https://theyear2026.com/top-budgeting-apps-in-2026/)
- [Best Family Budgeting Apps 2026 | BestMoney](https://www.bestmoney.com/financial-advisor/learn-more/best-budgeting-apps-for-families)

---

*Research complete. Ready for roadmap planning with clear table stakes vs differentiators vs anti-features categorization.*
