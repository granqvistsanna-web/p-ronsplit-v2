# Phase 6: Budget Tracking UI - Research

**Researched:** 2026-01-28
**Domain:** React UI components, Budget visualization, Recharts integration, Responsive design
**Confidence:** HIGH

## Summary

Phase 6 implements the budget tracking UI on top of the backend infrastructure built in Phase 5. The codebase already has most of the foundation in place - budgets are stored in Supabase, the `useBudgets` hook handles CRUD operations, and utility functions in `budgetUtils.ts` provide calculations for budget metrics, status determination, and formatting.

The current state shows:
- `BudgetOverviewSection` component exists with summary cards and overall progress bar
- `BudgetCategoryList` component exists with per-category breakdown and drill-down
- `BudgetSettingsModal` exists for setting budget amounts per category
- Budget calculations and status logic (`on-track`, `warning`, `exceeded`) are implemented
- Integration with the Analys page is complete

**What's missing:** The requirements specify pacing insights (BUD-06) showing "on track" vs "over pace" based on current day in period. The existing implementation shows budget status based on percentage used but NOT pacing relative to days elapsed. Also, TECH-01 requires explicit height constraints on ALL Recharts components, which needs verification.

**Primary recommendation:** Implement pacing insight calculation based on time elapsed in period (day of month/year) vs budget consumed, add pacing status to budget metrics, and update UI to display pacing insights. Verify all Recharts components have explicit height constraints via className or style props.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18.3 | 18.3.1 | UI framework | Project standard, modern hooks API |
| Recharts | 2.15.4 | Charts library | Already used for CategoryBarChart, TrendChart, proven responsive |
| Radix UI | Various | Primitives (Progress, Sheet, Drawer, Toggle, Switch) | Accessible, unstyled, composable - project standard |
| Tailwind CSS | 3.4.17 | Styling | Project standard, utility-first approach |
| React Query | 5.83.0 | Data fetching | Already used for `useBudgets`, handles caching/invalidation |
| date-fns | 3.6.0 | Date calculations | Already used across project for date range logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | 12.23.26 | Animations | Already used in BudgetSettingsModal, use for smooth transitions |
| lucide-react | 0.562.0 | Icons | Project standard for all icons (Target, Wallet, TrendingDown, etc) |
| sonner | 1.7.4 | Toast notifications | Used by useBudgets mutations for success/error feedback |
| vaul | 0.9.9 | Drawer primitive | Used for mobile bottom sheets (<768px breakpoint) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Victory, Chart.js | Recharts already integrated, consistent API across existing charts |
| Radix Progress | Custom div + CSS | Radix provides accessibility (aria-valuenow), smooth transitions |
| date-fns | Day.js, Luxon | date-fns already used for all date operations, sv locale support |

**Installation:**
All dependencies already installed. No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── analytics/               # Analytics visualizations
│   │   ├── BudgetOverviewSection.tsx     # Exists: Summary cards + overall progress
│   │   ├── BudgetCategoryList.tsx        # Exists: Per-category breakdown
│   │   ├── BudgetPacingInsight.tsx       # NEW: Pacing insight component (optional)
│   │   └── CategoryBarChart.tsx          # Existing chart (verify height)
│   ├── BudgetSettingsModal.tsx  # Exists: Budget setup dialog
│   └── ui/                      # shadcn/ui primitives
│       ├── progress.tsx         # Radix Progress wrapper
│       ├── sheet.tsx            # Desktop side panels
│       ├── drawer.tsx           # Mobile bottom sheets
│       ├── toggle.tsx           # Toggle buttons
│       └── switch.tsx           # Enable/disable switches
├── hooks/
│   ├── useBudgets.tsx           # Exists: Budget CRUD via React Query
│   └── use-mobile.tsx           # Exists: 768px breakpoint detection
├── lib/
│   ├── budgetUtils.ts           # Exists: Budget calculations, status, formatting
│   └── types.ts                 # Shared types (Budget, Expense, Category)
└── pages/
    └── Analys.tsx               # Integration point (budgets already integrated)
```

### Pattern 1: Budget Pacing Calculation
**What:** Calculate pacing status comparing time elapsed vs budget consumed
**When to use:** For monthly/yearly budgets with time-based pacing insights
**Example:**
```typescript
// Add to budgetUtils.ts
export type PacingStatus = "on-track" | "over-pace";

export function calculatePacing(
  spent: number,
  budget: number,
  currentDay: number,
  totalDaysInPeriod: number
): PacingStatus {
  const expectedSpending = (budget * currentDay) / totalDaysInPeriod;
  return spent <= expectedSpending ? "on-track" : "over-pace";
}

// Update BudgetMetric interface
export interface BudgetMetric {
  // ... existing fields
  pacing: PacingStatus;
  expectedSpending: number;
}
```

### Pattern 2: Responsive Dialog Pattern (Already Established)
**What:** Sheet (>=768px) + Drawer (<768px) using useIsMobile hook
**When to use:** For all modal/side panel content
**Example:**
```typescript
// From CategoryDrillDown - established pattern
const isMobile = useIsMobile();

{isMobile ? (
  <Drawer open={open} onOpenChange={setOpen}>
    <DrawerContent className="min-h-[300px]">
      {/* Content */}
    </DrawerContent>
  </Drawer>
) : (
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side="right" className="w-[400px] sm:w-[540px]">
      {/* Content */}
    </SheetContent>
  </Sheet>
)}
```

### Pattern 3: Progress Bar with Status Colors (Already Established)
**What:** Radix Progress with Tailwind background classes for status
**When to use:** Budget progress visualization
**Example:**
```typescript
// From BudgetOverviewSection - existing pattern
<div className="h-3 bg-muted rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressColor(status)}`}
    style={{ width: `${Math.min(percentUsed, 100)}%` }}
  />
</div>

// budgetUtils.ts - existing utility
export function getBudgetProgressColor(status: BudgetStatus): string {
  switch (status) {
    case "on-track": return "bg-green-500";
    case "warning": return "bg-yellow-500";
    case "exceeded": return "bg-red-500";
  }
}
```

### Pattern 4: Recharts Height Constraints (TECH-01 Requirement)
**What:** Explicit height on ChartContainer or ResponsiveContainer parent
**When to use:** ALL Recharts components to prevent mobile layout issues
**Example:**
```typescript
// From CategoryBarChart - existing pattern (GOOD)
<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={displayData}>
      {/* Chart content */}
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>

// From TrendChart - existing pattern (GOOD)
<ChartContainer config={chartConfig} className="h-[280px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={formattedData}>
      {/* Chart content */}
    </AreaChart>
  </ResponsiveContainer>
</ChartContainer>

// PATTERN: Always use min-h-[Xpx] or h-[Xpx] on ChartContainer
// ResponsiveContainer inherits height via "100%"
```

### Anti-Patterns to Avoid
- **Missing height on ChartContainer:** Recharts will collapse on mobile without explicit height. Always use `min-h-[300px]` or `h-[280px]` on the parent container.
- **Inline pacing logic in components:** Keep pacing calculations in `budgetUtils.ts` for testability and reusability.
- **Separate pacing and status checks:** Pacing is different from budget status. Status = percentage used (80/100 = warning), Pacing = time vs spending (day 15/30 but 60% spent = over-pace).
- **Hardcoded 30 days for monthly budgets:** Use date-fns `getDaysInMonth()` for accurate day counts (28/29/30/31 days).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bars with animation | Custom div with CSS transitions | Radix Progress (`@radix-ui/react-progress`) | Handles aria-valuenow, aria-valuemin/max for accessibility, smooth transitions built-in |
| Mobile/desktop detection | Custom window.innerWidth checks | `useIsMobile` hook (already exists) | Centralized 768px breakpoint, handles resize events, React-friendly |
| Date range calculations | Manual date math | date-fns functions (`getDaysInMonth`, `differenceInDays`) | Handles edge cases (leap years, DST), locale support |
| Budget status colors | Inline ternary chains | `getBudgetStatusColor()` utility (already exists) | Centralized color logic, dark mode support, consistent across components |
| Chart responsive sizing | Manual window resize handlers | Recharts ResponsiveContainer + explicit parent height | Recharts handles resize automatically, parent height prevents collapse |

**Key insight:** The project already has well-established utilities and patterns. Don't reinvent - extend existing `budgetUtils.ts` functions and follow established component patterns.

## Common Pitfalls

### Pitfall 1: Pacing vs Status Confusion
**What goes wrong:** Using budget status (`on-track`/`warning`/`exceeded`) as pacing insight
**Why it happens:** Both use similar thresholds, easy to conflate
**How to avoid:**
- Status = percentage of budget consumed (spent / budget * 100)
- Pacing = time-adjusted spending (spent vs expected spending based on days elapsed)
- A budget can be `on-track` (70% spent) but `over-pace` (day 10/30 = 33% expected, but 70% spent)
**Warning signs:** Pacing insight changes only when budget status changes (wrong - should change daily)

### Pitfall 2: Month Length Assumptions
**What goes wrong:** Hardcoding 30 days for monthly pacing calculations
**Why it happens:** Quick approximation, but months have 28-31 days
**How to avoid:** Use `getDaysInMonth()` from date-fns for accurate calculations
**Warning signs:** Pacing insights off by 1-3 days at month end, February calculations incorrect

### Pitfall 3: Recharts Collapse on Mobile (TECH-01)
**What goes wrong:** Charts disappear or show as tiny slivers on mobile
**Why it happens:** ResponsiveContainer needs explicit height on parent, auto-height fails
**How to avoid:** Always set `min-h-[300px]` or `h-[280px]` on ChartContainer or parent div
**Warning signs:** Chart works on desktop, breaks on mobile or when browser window narrow

### Pitfall 4: Progress Bar Overflow
**What goes wrong:** Progress bar exceeds container when >100% budget spent
**Why it happens:** Not capping width at 100% in style calculation
**How to avoid:** Always use `Math.min(percentUsed, 100)` for width percentage
**Warning signs:** Progress bar breaks layout, horizontal scroll appears

### Pitfall 5: Toggle vs Switch Component Confusion
**What goes wrong:** Using Switch when Toggle is needed (or vice versa)
**Why it happens:** Both are binary controls, but semantics differ
**How to avoid:**
- Switch = enable/disable, on/off state (use for budget enabled/disabled)
- Toggle = pressed/unpressed state (use for stacked mode toggle)
**Warning signs:** Incorrect aria roles, confusing UX

## Code Examples

Verified patterns from the codebase:

### Pacing Insight Calculation (NEW - to be added)
```typescript
// Add to budgetUtils.ts
import { getDaysInMonth, getDate } from "date-fns";

export type PacingStatus = "on-track" | "over-pace";

/**
 * Calculate budget pacing status based on time elapsed in period.
 *
 * @param spent - Amount spent so far (in kr)
 * @param budget - Total budget amount (in kr)
 * @param year - Current year
 * @param month - Current month (0-11) for monthly, undefined for yearly
 * @returns Pacing status and expected spending
 */
export function calculateBudgetPacing(
  spent: number,
  budget: number,
  year: number,
  month?: number
): { pacing: PacingStatus; expectedSpending: number } {
  const now = new Date();
  let currentDay: number;
  let totalDays: number;

  if (month !== undefined) {
    // Monthly pacing
    currentDay = getDate(now);
    totalDays = getDaysInMonth(new Date(year, month));
  } else {
    // Yearly pacing
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    currentDay = differenceInDays(now, startOfYear) + 1;
    totalDays = differenceInDays(endOfYear, startOfYear) + 1;
  }

  const expectedSpending = (budget * currentDay) / totalDays;
  const pacing: PacingStatus = spent <= expectedSpending ? "on-track" : "over-pace";

  return { pacing, expectedSpending };
}

// Update BudgetMetric interface to include pacing
export interface BudgetMetric {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
  pacing: PacingStatus;        // NEW
  expectedSpending: number;    // NEW
}

// Update calculateBudgetMetrics to include pacing
export function calculateBudgetMetrics(
  budgets: Budget[],
  expenses: Expense[],
  year: number,
  month?: number
): BudgetMetric[] {
  const spentByCategory = month !== undefined
    ? aggregateMonthlyExpenses(expenses, year, month)
    : aggregateYearlyExpenses(expenses, year);

  const metrics: BudgetMetric[] = budgets
    .filter((budget) => budget.enabled)
    .map((budget) => {
      const categoryInfo = getCategoryInfo(budget.category);
      const budgetAmount = öreToKr(budget.amount);
      const spent = spentByCategory[budget.category.toLowerCase()] || 0;
      const remaining = budgetAmount - spent;
      const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      const status = getBudgetStatus(percentUsed);
      const { pacing, expectedSpending } = calculateBudgetPacing(
        spent,
        budgetAmount,
        year,
        month
      );

      return {
        categoryId: budget.category,
        categoryName: categoryInfo.name,
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        budget: budgetAmount,
        spent,
        remaining,
        percentUsed,
        status,
        pacing,              // NEW
        expectedSpending,    // NEW
      };
    });

  return metrics.sort((a, b) => b.percentUsed - a.percentUsed);
}
```

### Pacing Insight Display (NEW - to be added)
```typescript
// Add to BudgetCategoryList or create new component
interface PacingInsightProps {
  pacing: PacingStatus;
  spent: number;
  expectedSpending: number;
}

function PacingInsight({ pacing, spent, expectedSpending }: PacingInsightProps) {
  const isPacingGood = pacing === "on-track";
  const difference = Math.abs(spent - expectedSpending);

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
      isPacingGood
        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
    }`}>
      {isPacingGood ? (
        <>
          <TrendingDown size={12} />
          <span>På rätt väg</span>
        </>
      ) : (
        <>
          <TrendingUp size={12} />
          <span>Över budget ({formatBudgetAmount(difference)} mer än förväntat)</span>
        </>
      )}
    </div>
  );
}
```

### Recharts Height Constraints (EXISTING - verify all charts)
```typescript
// GOOD: CategoryBarChart (already correct)
<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={displayData}>
      {/* Chart content */}
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>

// GOOD: TrendChart (already correct)
<ChartContainer config={chartConfig} className="h-[280px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={formattedData}>
      {/* Chart content */}
    </AreaChart>
  </ResponsiveContainer>
</ChartContainer>

// CHECKLIST: Verify these files have explicit height:
// - CategoryBarChart.tsx ✓ (min-h-[300px])
// - TrendChart.tsx ✓ (h-[280px])
// - CategoryDonut.tsx (needs verification)
// - ComparisonBar.tsx (needs verification)
```

### Budget Setup Dialog Pattern (EXISTING)
```typescript
// From BudgetSettingsModal - established pattern
const [budgetInputs, setBudgetInputs] = useState<BudgetInput[]>([]);

// Per-category input with enable/disable toggle
{budgetInputs.map((input) => (
  <div key={input.categoryId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    {/* Category icon and name */}
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-xl">{category.icon}</span>
      <span className="font-medium text-sm">{category.name}</span>
    </div>

    {/* Amount input */}
    <Input
      type="number"
      value={input.amount}
      onChange={(e) => handleAmountChange(input.categoryId, e.target.value)}
      disabled={!input.enabled}
    />

    {/* Enable/disable toggle */}
    <Switch
      checked={input.enabled}
      onCheckedChange={(checked) => handleEnabledChange(input.categoryId, checked)}
    />
  </div>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Budget status only | Budget status + pacing insights | This phase | Gives users time-aware spending feedback |
| Auto-height charts | Explicit height constraints | Phase 3 (03-01) | Prevents mobile chart collapse (TECH-01) |
| Modal dialogs everywhere | Responsive Sheet/Drawer pattern | Phase 4 (04-01) | Better mobile UX, consistent pattern |
| Custom toggle UI | Radix Toggle component | Phase 3 (03-02) | Accessibility, consistent behavior |
| localStorage budgets | Supabase budgets | Phase 5 | Multi-user sync, RLS security |

**Deprecated/outdated:**
- Custom progress bars: Use Radix Progress for accessibility and smooth transitions
- Inline budget calculations: Use centralized `budgetUtils.ts` functions
- 30-day month assumptions: Use date-fns `getDaysInMonth()` for accuracy

## Open Questions

1. **Should pacing insights be displayed for all budget statuses?**
   - What we know: Pacing is independent of status (can be on-track budget but over-pace)
   - What's unclear: If budget is already exceeded, is pacing insight still useful?
   - Recommendation: Show pacing for `on-track` and `warning` statuses only. For `exceeded`, the user already knows they're over budget - pacing adds little value.

2. **How to handle budgets spanning multiple months in date range filter?**
   - What we know: Analys page has date range filter, budgets are monthly or yearly
   - What's unclear: If user filters to Jan-Mar, should we show 3 months of budget (Jan + Feb + Mar) or hide budgets?
   - Recommendation: For v1, show budgets only when date range matches budget period (e.g., single month for monthly budgets, full year for yearly budgets). Add "Budget for [period]" label to clarify.

3. **Should budget setup dialog support bulk operations?**
   - What we know: BudgetSettingsModal saves all budgets at once
   - What's unclear: If user changes 5 categories, should we save as 5 separate mutations or batch?
   - Recommendation: Current implementation saves one-by-one via `saveBudget` in loop. This works but could be optimized. For v1, keep existing pattern. For v2, consider adding `saveBudgets` (plural) mutation for batch upsert.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `/src/components/analytics/BudgetOverviewSection.tsx` - Existing summary implementation
  - `/src/components/analytics/BudgetCategoryList.tsx` - Existing category breakdown
  - `/src/components/BudgetSettingsModal.tsx` - Budget setup dialog pattern
  - `/src/lib/budgetUtils.ts` - Budget calculation utilities
  - `/src/hooks/useBudgets.tsx` - React Query hook for CRUD operations
  - `/src/components/ui/progress.tsx` - Radix Progress wrapper
  - `/src/hooks/use-mobile.tsx` - Responsive breakpoint detection
- `.planning/REQUIREMENTS.md` - Phase 6 requirements (BUD-02 through BUD-06, TECH-01)
- `.planning/STATE.md` - Prior decisions affecting implementation
- `package.json` - Dependency versions (Recharts 2.15.4, React Query 5.83.0, Radix UI, date-fns 3.6.0)

### Secondary (MEDIUM confidence)
- None required - all information derived from codebase analysis

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and in use
- Architecture: HIGH - Patterns established in Phases 3-5, well-documented in codebase
- Pitfalls: HIGH - Identified from existing code comments and STATE.md decisions

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain, established patterns)
