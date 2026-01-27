# Analytics Dashboard Pitfalls

**Domain:** Analytics Dashboard Enhancement (Recharts + shadcn/ui)
**Researched:** 2026-01-27
**Confidence:** HIGH (Recharts-specific issues), MEDIUM (general patterns)

## Critical Pitfalls

Mistakes that cause rewrites, performance issues, or major user experience problems.

### Pitfall 1: ResponsiveContainer Height Not Defined on Parent

**What goes wrong:** Chart either doesn't render at all, renders at 0px height, or renders with infinite/fixed height that doesn't adapt to viewport changes.

**Why it happens:** ResponsiveContainer with `height="100%"` requires an explicit height on its parent container. Using percentage-based heights (vh/vw) or auto height causes the chart to collapse or fail.

**Consequences:**
- Charts invisible on mobile despite code working
- Infinite height growth crashes browser
- Warnings flood console: "width(-1) and height(-1) should be greater than 0"
- User sees blank space instead of visualization

**Prevention:**
```tsx
// BAD - parent has no explicit height
<div className="w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>

// GOOD - parent has explicit height
<div className="w-full h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>
</div>

// GOOD - using shadcn/ui ChartContainer with min-h
<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
  <BarChart data={data}>...</BarChart>
</ChartContainer>
```

**Detection:**
- Console warnings about width/height being 0 or -1
- Charts not visible in specific breakpoints
- Chart container has 0 computed height in dev tools

**Which phase should address it:** Filter bar + categories phase — establish chart wrapper pattern early to avoid rework across all visualizations.

**Sources:**
- [ResponsiveContainer not filling height · Issue #1545](https://github.com/recharts/recharts/issues/1545)
- [Chart's Height increasing infinitely · Issue #5388](https://github.com/recharts/recharts/issues/5388)

---

### Pitfall 2: Large Dataset Performance Cliff (>1000 Points)

**What goes wrong:** Charts become laggy or unresponsive when rendering thousands of expense records. Hover interactions take 500ms+, scroll stutters, and browser may crash with 10K+ points.

**Why it happens:** Recharts recalculates and re-renders all chart elements on any state change. Each data point creates multiple DOM elements (path segments, hover areas, labels). All Scatter/Line components re-render on every prop change.

**Consequences:**
- Users with years of expense data experience frozen UI
- Mobile devices become unusable
- Tooltips lag behind cursor
- Filter changes take seconds to reflect

**Prevention:**

1. **Data Decimation** — Downsample before passing to chart:
```tsx
// Use LTTB (Largest Triangle Three Buckets) algorithm
import { downsample } from 'downsample-lttb'; // or similar library

const MAX_CHART_POINTS = 500;
const chartData = useMemo(() => {
  if (rawData.length > MAX_CHART_POINTS) {
    return downsample(rawData, MAX_CHART_POINTS);
  }
  return rawData;
}, [rawData]);
```

2. **Aggregate by Time Period** — For date ranges >90 days, group expenses by week/month:
```tsx
const aggregatedData = useMemo(() => {
  const daysDiff = differenceInDays(dateRange.end, dateRange.start);
  if (daysDiff > 90) {
    return groupExpensesByWeek(expenses);
  }
  return expenses;
}, [expenses, dateRange]);
```

3. **Stable dataKey References** — Use useCallback for function dataKeys:
```tsx
// BAD - creates new function every render
<Bar dataKey={(item) => item.amount} />

// GOOD - stable reference
const amountAccessor = useCallback((item: Expense) => item.amount, []);
<Bar dataKey={amountAccessor} />

// BEST - use string key
<Bar dataKey="amount" />
```

4. **Virtualize Category Lists** — Use react-virtual for long category lists with charts

**Detection:**
- React DevTools Profiler shows >100ms render times for chart components
- Tooltip lag exceeds 200ms
- Frame rate drops below 30fps when interacting with chart
- Users with >1000 expenses report slowness

**Which phase should address it:** Categories breakdown phase — implement aggregation strategy before adding budget comparisons that compound the problem.

**Sources:**
- [Recharts is slow with large data · Issue #1146](https://github.com/recharts/recharts/issues/1146)
- [Improving Recharts performance](https://belchior.hashnode.dev/improving-recharts-performance-clp5w295y000b0ajq8hu6cnmm)
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)

---

### Pitfall 3: URL State Sync Creates Dual Source of Truth

**What goes wrong:** Filters stored in both React state and URL query params get out of sync. Back button doesn't restore filter state, or changing filters doesn't update URL, breaking shareable links.

**Why it happens:** Managing two state sources (React state + URL) separately without proper synchronization. Missing bidirectional data flow between useState and router.

**Consequences:**
- User shares URL but recipient sees different data
- Browser back/forward buttons don't work as expected
- Refreshing page loses filter state
- Deep links break after state changes
- State updates flood browser history, making back button unusable

**Prevention:**

1. **Single Source of Truth** — URL params are the state, not a copy:
```tsx
// BAD - dual state
const [filters, setFilters] = useState(defaultFilters);
useEffect(() => {
  const params = new URLSearchParams(searchParams);
  params.set('dateRange', filters.dateRange);
  // ... sync to URL
}, [filters]);

// GOOD - URL is the source
const [searchParams, setSearchParams] = useSearchParams();
const filters = useMemo(() => ({
  dateRange: searchParams.get('dateRange') || 'thisMonth',
  category: searchParams.get('category') || 'all',
  topN: Number(searchParams.get('topN')) || 8
}), [searchParams]);

const updateFilters = useCallback((updates: Partial<Filters>) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    Object.entries(updates).forEach(([key, value]) => {
      next.set(key, String(value));
    });
    return next;
  }, { replace: false }); // pushState for navigation
}, [setSearchParams]);
```

2. **Choose Push vs Replace Wisely**:
   - **Push** (new history entry): Date range changes, category selection, pagination
   - **Replace** (update current): Search-as-you-type, minor UI adjustments, initial load

3. **Type Conversion at Boundary**:
```tsx
// Parse once at the boundary, use typed state internally
type FilterState = {
  dateRange: DateRangePreset;
  topN: number;
  showStacked: boolean;
};

const parseFiltersFromURL = (params: URLSearchParams): FilterState => ({
  dateRange: (params.get('dateRange') as DateRangePreset) || 'thisMonth',
  topN: Number(params.get('topN')) || 8,
  showStacked: params.get('stacked') === 'true'
});
```

4. **Consider nuqs Library** — Type-safe URL state management:
```tsx
import { useQueryState } from 'nuqs';

const [dateRange, setDateRange] = useQueryState('dateRange', {
  defaultValue: 'thisMonth',
  history: 'push'
});
```

**Detection:**
- Sharing URL shows different data than sender
- Back button doesn't restore previous filter state
- URL doesn't change when filters change
- Browser history has dozens of entries from typing

**Which phase should address it:** Filter bar foundation phase — establish URL state pattern before adding drill-down and budget panels that will use the same pattern.

**Sources:**
- [Your URL Is Your State](https://alfy.blog/2025/10/31/your-url-is-your-state.html)
- [Advanced React state management using URL parameters](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)
- [Why You Should Use nuqs](https://medium.com/@ruverd/why-you-should-use-nuqs-smarter-url-state-management-for-react-next-js-26a8b51ca1ac)

---

### Pitfall 4: Currency Precision and Rounding Edge Cases

**What goes wrong:** Budget calculations show incorrect totals. $3.75 × 3.6% = $0.13 instead of $0.14. Progress bars show 100.1% when budget is exactly met. Summing category expenses doesn't equal total expenses.

**Why it happens:** JavaScript uses IEEE 754 floating-point which can't represent decimal values exactly. Rounding at different stages (data fetch vs calculation vs display) produces inconsistent results. Different rounding methods (half-up vs banker's rounding) cause discrepancies.

**Consequences:**
- User sets budget of 1000 kr, spends exactly 1000 kr, sees "Over budget by 0.01 kr"
- Category totals don't sum to displayed total
- Progress bar shows red (>100%) when budget perfectly met
- Shared households see different totals due to rounding order
- Compliance/audit issues if data exported doesn't match UI

**Prevention:**

1. **Round Consistently at Display Boundary**:
```tsx
// Store and calculate in cents/öre (integers)
type Amount = {
  valueInCents: number; // 123450 = 1234.50 kr
};

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
};

// For calculations, work with cents
const budgetProgress = (spentCents: number, budgetCents: number) => {
  return Math.floor((spentCents / budgetCents) * 100); // Always round down %
};
```

2. **Define Rounding Method Explicitly**:
```tsx
// Half-up rounding (standard for Swedish currency)
const roundToKronor = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

// For budget comparisons, use floor for spent, ceil for remaining
const budgetStatus = {
  spent: Math.floor(totalSpent * 100) / 100,
  remaining: Math.ceil(budgetRemaining * 100) / 100
};
```

3. **Aggregate Before Rounding**:
```tsx
// BAD - rounds then sums (compounds error)
const categoryTotals = expenses.map(e =>
  Math.round(e.amount * 100) / 100
).reduce((sum, amt) => sum + amt, 0);

// GOOD - sums then rounds once
const categoryTotal = Math.round(
  expenses.reduce((sum, e) => sum + e.amount, 0) * 100
) / 100;
```

4. **Use Epsilon for Comparisons**:
```tsx
const EPSILON = 0.01; // 1 öre tolerance

const isOverBudget = (spent: number, budget: number): boolean => {
  return spent > budget + EPSILON;
};

const budgetStatusClass = (spent: number, budget: number): string => {
  const ratio = spent / budget;
  if (ratio > 1 + EPSILON) return 'error';
  if (ratio > 0.8) return 'warning';
  return 'neutral';
};
```

5. **Test Edge Cases**:
```tsx
describe('Budget calculations', () => {
  it('handles exact budget match', () => {
    expect(budgetProgress(1000.00, 1000.00)).toBe(100);
    expect(isOverBudget(1000.00, 1000.00)).toBe(false);
  });

  it('handles .005 rounding edge case', () => {
    expect(roundToKronor(1.005)).toBe(1.01); // not 1.00
  });

  it('sums category totals correctly', () => {
    const categories = [33.33, 33.33, 33.34];
    expect(roundToKronor(categories.reduce((a,b) => a+b))).toBe(100.00);
  });
});
```

**Detection:**
- Budget progress shows >100% when amounts match exactly
- Sum of category charts ≠ total in KPI card
- Rounding errors compound when filtering by member
- User reports "numbers don't add up"

**Which phase should address it:** Budget setup phase — define currency handling before implementing progress bars and comparisons.

**Sources:**
- [Handling Precision in Financial Calculations](https://medium.com/@stanislavbabenko/handling-precision-in-financial-calculations-in-net-a-deep-dive-into-decimal-and-common-pitfalls-1211cc5edd3b)
- [Currency Rounding - Everything you need to know](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/6662923736859-Currency-Rounding-Everything-you-need-to-know)
- [Handle Money in JavaScript: Financial Precision Without Losing a Cent](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or usability issues but are recoverable.

### Pitfall 5: Mobile Touch Interactions Broken on Charts

**What goes wrong:** Tooltips don't appear on touch. Drill-down taps trigger parent navigation. Pinch-zoom conflicts with chart interactions. Long-press doesn't work for contextual actions.

**Why it happens:** Recharts tooltip defaults to hover-only. Touch events propagate differently than mouse events. Mobile browsers have default gestures that conflict with chart interactions.

**Consequences:**
- Mobile users can't see detailed data in tooltips
- Accidental navigation when trying to tap bar segment
- Frustration leads to "just use the web version on desktop"
- Accessibility issues for screen reader users

**Prevention:**

1. **Make Tooltips Touch-Friendly**:
```tsx
// Recharts built-in tooltip is hover-only, needs custom implementation
const [activeIndex, setActiveIndex] = useState<number | null>(null);

<BarChart
  data={data}
  onClick={(data) => {
    if (data?.activeTooltipIndex !== undefined) {
      setActiveIndex(data.activeTooltipIndex);
    }
  }}
>
  <Tooltip
    active={activeIndex !== null}
    cursor={{ fill: 'transparent' }}
  />
</BarChart>
```

2. **Use Bottom Sheet for Mobile Drill-Down**:
```tsx
// Desktop: side panel
// Mobile: bottom sheet (Vaul or similar)
import { Sheet, SheetContent } from '@/components/ui/sheet';

const CategoryDrillDown = ({ category, open, onClose }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[80vh]' : 'w-[400px]'}
      >
        {/* drill-down content */}
      </SheetContent>
    </Sheet>
  );
};
```

3. **Ensure Touch Targets ≥44px**:
```tsx
// Category legend items need sufficient touch area
<button
  className="flex items-center gap-2 min-h-[44px] w-full px-3"
  onClick={() => handleCategoryDrillDown(category)}
>
  <span className="w-4 h-4 rounded-full" style={{ background: color }} />
  <span>{category.name}</span>
</button>
```

4. **Test Multi-Step Flows on Mobile First**:
```tsx
// Filter → Category → Transaction drill-down
// Ensure each step is discoverable without hover
// Add breadcrumbs or back navigation
```

**Detection:**
- User testing on mobile shows confusion
- Analytics show mobile users don't access drill-down features
- Touch tooltips don't appear
- Accidental clicks when trying to interact with chart

**Which phase should address it:** Drill-down panel phase — design mobile interaction pattern before implementing desktop version to avoid mobile-as-afterthought.

**Sources:**
- [Mobile App UI/UX Design Trends 2026](https://www.letsgroto.com/blog/mobile-app-ui-ux-design-trends-2026-the-only-guide-you-ll-need)
- [Dashboard Design UX Patterns Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [A Practical Guide to Hacking the Recharts Library](https://www.olioapps.com/blog/graph-hacking)

---

### Pitfall 6: Stacked Bar Charts with Negative Values Overlap

**What goes wrong:** When stacking expenses and refunds (positive/negative values), bars overlap instead of stacking above/below zero axis. Visual shows only one value, hiding the other.

**Why it happens:** Recharts' default stacking behavior treats all values as unidirectional. Negative values stack "on top of" positive values in the same direction instead of in opposite directions.

**Consequences:**
- Refunds/returns invisible in category breakdown
- User thinks they spent $1000 when net is $0 (spent $1000, refunded $1000)
- Income vs expense comparison shows incorrect totals
- Data integrity looks broken

**Prevention:**

1. **Use Separate Bars for Positive/Negative**:
```tsx
// Split data into positive and negative series
const positiveExpenses = data.map(d => ({
  ...d,
  positive: d.amount > 0 ? d.amount : 0
}));
const negativeExpenses = data.map(d => ({
  ...d,
  negative: d.amount < 0 ? d.amount : 0
}));

<BarChart data={data}>
  <Bar dataKey="positive" stackId="a" fill={colors.expense} />
  <Bar dataKey="negative" stackId="b" fill={colors.refund} />
</BarChart>
```

2. **Use BarChartStackedBySign Pattern** (Recharts Example):
```tsx
// Reference: https://recharts.github.io/en-US/examples/StackedBarChart/
// Implements proper stacking with stackOffset
```

3. **Consider Separate Charts for Income/Expense**:
```tsx
// If negative values are rare (refunds), show them separately
<div className="space-y-4">
  <BarChart data={expenses} title="Expenses" />
  {hasRefunds && <BarChart data={refunds} title="Refunds" />}
</div>
```

4. **Test with Real Data Including Edge Cases**:
```tsx
const testData = [
  { category: 'Food', amount: 1000 },        // positive only
  { category: 'Shopping', amount: -500 },    // negative only
  { category: 'Transport', member1: 500, member2: -200 }, // mixed
];
```

**Detection:**
- Visual inspection shows overlapping bars
- Total shown in chart doesn't match sum in legend
- Some bars have zero height when they shouldn't
- Category with refund shows only expense or only refund

**Which phase should address it:** Categories breakdown phase — decide on stacking strategy before implementing per-member stacking.

**Sources:**
- [Stacked Charts for Positive and Negative Numbers? · Issue #164](https://github.com/recharts/recharts/issues/164)
- [StackedBarChart with positive and negative value · Issue #621](https://github.com/recharts/recharts/issues/621)

---

### Pitfall 7: React Query Cache and URL State Desync

**What goes wrong:** User changes URL filter params, but React Query returns cached data from previous filter state. Or inversely, React Query refetches but URL doesn't update, breaking browser back button.

**Why it happens:** React Query cache keys don't include all filter params, so different filter states share the same cache entry. Or URL updates don't trigger React Query invalidation.

**Consequences:**
- User selects "Last 3 months" but sees "This month" data
- Back button goes to previous URL but shows current data
- Sharing URL shows stale cached data instead of fresh query
- Filter changes don't trigger data refresh

**Prevention:**

1. **Include All Filters in Query Key**:
```tsx
// BAD - missing filter params in key
const { data: expenses } = useQuery({
  queryKey: ['expenses', groupId],
  queryFn: () => fetchExpenses(groupId, filters)
});

// GOOD - filters in query key
const { data: expenses } = useQuery({
  queryKey: ['expenses', groupId, filters.dateRange, filters.category],
  queryFn: () => fetchExpenses(groupId, filters)
});

// BEST - entire filter object as key (if stable reference)
const { data: expenses } = useQuery({
  queryKey: ['expenses', groupId, filters],
  queryFn: () => fetchExpenses(groupId, filters)
});
```

2. **Derive Filters from URL in Query**:
```tsx
// URL is source of truth, read it inside the query
const ExpenseChart = () => {
  const [searchParams] = useSearchParams();
  const filters = parseFiltersFromURL(searchParams);

  const { data } = useQuery({
    queryKey: ['expenses', groupId, filters],
    queryFn: () => fetchExpenses(groupId, filters),
    // Cache per unique filter combination
  });

  // Changing searchParams automatically triggers new query
};
```

3. **Invalidate on Filter Change (if needed)**:
```tsx
// Only if using separate state management
const updateFilters = (newFilters: Filters) => {
  setSearchParams(toURLParams(newFilters));
  queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
};
```

4. **Avoid Premature Optimization with Cache**:
```tsx
// Don't share cache between different filter states
// staleTime: 0 for filter queries if data changes frequently
const { data } = useQuery({
  queryKey: ['expenses', groupId, filters],
  queryFn: () => fetchExpenses(groupId, filters),
  staleTime: 30_000, // 30s is reasonable for expense data
  // Not: staleTime: Infinity (will never refetch)
});
```

**Detection:**
- Data doesn't update when filter changes
- Back button shows wrong data
- React Query DevTools shows cache hits when expecting fresh fetch
- Console logs show filter state different from rendered data

**Which phase should address it:** Filter bar foundation phase — establish query key pattern before adding more filtered queries.

**Sources:**
- [React Query Render Optimizations](https://tkdodo.eu/blog/react-query-render-optimizations)
- [TanStack Query Documentation](https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations)

---

### Pitfall 8: Data Overload on Mobile Destroys UX

**What goes wrong:** Desktop analytics view with 20+ metrics, multi-axis charts, and complex legends is crammed onto mobile. User can't distinguish data, text overlaps, charts unreadable.

**Why it happens:** "Responsive" CSS makes things smaller, not simpler. Designer shows all data on mobile because "users might need it." Multi-step flows avoided because "mobile users want everything at once."

**Consequences:**
- Mobile users abandon feature, use desktop only
- Pinch-zoom required to read labels defeats "mobile-friendly" claim
- Increased cognitive load makes insights invisible
- Accessibility fails for users with vision impairments

**Prevention:**

1. **Progressive Disclosure for Mobile**:
```tsx
const AnalyticsDashboard = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <>
        {/* Show only essential KPIs by default */}
        <KPICards metrics={['total', 'monthDelta']} />

        {/* Primary chart only */}
        <CategoryDonut topN={5} />

        {/* "View more" expands to detailed breakdown */}
        <Accordion>
          <AccordionItem value="trends">
            <AccordionTrigger>View trends</AccordionTrigger>
            <AccordionContent>
              <TrendChart simplified />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );
  }

  // Desktop shows all simultaneously
  return <FullDashboard />;
};
```

2. **Simplify Charts for Small Screens**:
```tsx
const CategoryChart = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <BarChart data={data}>
      {/* Mobile: hide minor gridlines, reduce label density */}
      <CartesianGrid
        strokeDasharray="3 3"
        vertical={!isMobile}
      />
      <XAxis
        dataKey="category"
        angle={isMobile ? -45 : 0}
        interval={isMobile ? 1 : 0} // Show every other label
        height={isMobile ? 80 : 30}
      />
      {/* Mobile: hide legend, show in tooltip instead */}
      {!isMobile && <Legend />}
    </BarChart>
  );
};
```

3. **Ask "What's the On-the-Go Use Case?"**:
```tsx
// Mobile: Quick budget check "Am I over budget?"
// Desktop: Deep analysis "Where exactly did I overspend?"

// Don't force desktop analysis workflows onto mobile
```

4. **Test on Real Devices, Not Browser DevTools**:
- Small screen doesn't just mean narrow width
- Touch interactions differ from hover
- Performance on mid-range Android ≠ Macbook Pro

**Detection:**
- User testing shows confusion/frustration on mobile
- Analytics show mobile sessions much shorter than desktop
- Support requests mention "can't read chart on phone"
- Accessibility audit fails on text size/contrast

**Which phase should address it:** All phases — mobile-first approach for each feature, not retrofit at the end.

**Sources:**
- [Dashboard Design UX Patterns Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [7 Mobile UX/UI Design Patterns Dominating 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)

---

## Minor Pitfalls

Mistakes that cause annoyance or minor inconsistencies but are easily fixed.

### Pitfall 9: Chart Colors Don't Meet Accessibility Standards

**What goes wrong:** Category colors too similar to distinguish. Color-blind users can't differentiate expense categories. Low contrast makes labels unreadable.

**Why it happens:** Choosing colors aesthetically without checking contrast ratios. Using red/green as sole indicators (8% of males are red-green colorblind). Generated color palettes lack sufficient differentiation.

**Prevention:**

1. **Use Accessible Color Palettes**:
```tsx
// shadcn/ui chart config includes accessible defaults
const chartConfig = {
  food: { label: 'Mat', color: 'hsl(var(--chart-1))' },
  transport: { label: 'Transport', color: 'hsl(var(--chart-2))' },
  // ... uses predefined accessible colors
};
```

2. **Add Patterns/Textures for Redundancy**:
```tsx
// Don't rely on color alone
<Bar dataKey="amount" fill={color}>
  {data.map((entry, index) => (
    <Cell key={index} fill={colors[index]} stroke="#000" strokeWidth={1} />
  ))}
</Bar>
```

3. **Test with Color-Blind Simulators**:
- Use Chrome DevTools > Rendering > Emulate vision deficiencies
- Check Deuteranopia (green-blind), Protanopia (red-blind)

4. **Ensure 4.5:1 Contrast for Text**:
```tsx
// Labels on dark backgrounds need light text
<text fill={isDarkBackground ? '#fff' : '#000'} />
```

**Detection:**
- Accessibility audit fails
- User feedback mentions difficulty distinguishing categories
- Colors look identical in grayscale screenshot

**Which phase should address it:** Categories breakdown phase — establish color palette early.

**Sources:**
- [Dashboard Design UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)

---

### Pitfall 10: Missing Empty/Error States Create Confusion

**What goes wrong:** Chart shows blank space when no data. User thinks page is broken. Error states show generic "Something went wrong" without actionable guidance.

**Why it happens:** Happy path development focuses on data-rich scenarios. Empty states added last-minute as afterthought.

**Prevention:**

```tsx
const CategoryChart = ({ data, isLoading, error }) => {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="Kunde inte ladda data"
        description="Försök igen eller kontakta support om problemet kvarstår."
        action={<Button onClick={refetch}>Försök igen</Button>}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="Inga utgifter att visa"
        description="Lägg till utgifter för att se kategorier här."
        action={<Button onClick={onAddExpense}>Lägg till utgift</Button>}
      />
    );
  }

  return <BarChart data={data}>...</BarChart>;
};
```

**Detection:**
- Blank spaces during testing with empty database
- User confusion during onboarding
- Missing loading indicators

**Which phase should address it:** All phases — add empty states alongside feature implementation.

---

### Pitfall 11: Recharts Animation Causes React Query Flicker

**What goes wrong:** When React Query refetches in background, chart re-animates from zero, creating distracting flash even though data barely changed.

**Why it happens:** Recharts re-runs enter animation whenever data prop changes reference, which happens on every React Query background refetch.

**Prevention:**

```tsx
// Option 1: Disable animation for background refetches
<BarChart data={data} isAnimationActive={!isFetching}>
  ...
</BarChart>

// Option 2: Use placeholderData to prevent empty state
const { data, isFetching } = useQuery({
  queryKey: ['expenses', filters],
  queryFn: fetchExpenses,
  placeholderData: keepPreviousData, // Show stale data while refetching
});

// Option 3: Longer animation duration smooths transition
<BarChart data={data} animationDuration={800}>
  ...
</BarChart>
```

**Detection:**
- Chart "jumps" when data updates
- Animation plays on every state change
- User complains of flickering

**Which phase should address it:** Categories breakdown phase.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Filter bar foundation | URL state sync (Pitfall #3) | Establish URL-as-state pattern with nuqs or useSearchParams wrapper |
| Filter bar foundation | React Query cache desync (Pitfall #7) | Include all filter params in query keys |
| Categories breakdown | Large dataset performance (Pitfall #2) | Implement aggregation strategy before adding stacked views |
| Categories breakdown | ResponsiveContainer height (Pitfall #1) | Create reusable ChartWrapper with explicit height |
| Categories breakdown | Stacked bar negatives (Pitfall #6) | Test with refund data early, decide on stacking approach |
| Categories breakdown | Chart colors accessibility (Pitfall #9) | Use shadcn/ui chart config defaults |
| Drill-down panels | Mobile touch interactions (Pitfall #5) | Design mobile bottom sheet before desktop side panel |
| Drill-down panels | Data overload on mobile (Pitfall #8) | Progressive disclosure, show subset of data |
| Budget setup | Currency precision (Pitfall #4) | Define rounding strategy, store in cents, test edge cases |
| Budget setup | Budget progress rounding (Pitfall #4) | Use epsilon comparisons for status thresholds |
| All phases | Empty states missing (Pitfall #10) | Add empty/error/loading states alongside feature |
| All phases | Recharts animation flicker (Pitfall #11) | Use placeholderData in React Query |

---

## Recharts-Specific Gotchas

Quick reference for common Recharts issues specific to this library:

### 1. **ResponsiveContainer Requires Explicit Parent Height**
See Critical Pitfall #1 above.

### 2. **dataKey Changes Trigger Full Recalculation**
Keep dataKey stable with useCallback or string keys. Function dataKeys are performance killers.

### 3. **CartesianAxis Interval with Large Datasets**
```tsx
// Default interval="preserveEnd" calculates all ticks even if not shown
// With 1000+ data points, this causes lag
<XAxis interval="preserveStartEnd" /> // Much faster
```

### 4. **Tooltip Only Works on Hover by Default**
Custom implementation needed for touch. See Pitfall #5.

### 5. **Y-Axis Doesn't Stick on Scroll**
No "sticky" positioning for Y-axis. Design around this limitation.

### 6. **Brush Component Removes Wrong Elements in Stacked Bars**
Known bug fixed in recent versions. Update to latest Recharts (2.10+).

### 7. **ReferenceArea Doesn't Render with shadcn/ui ChartContainer**
Compatibility issue. Use Recharts' ResponsiveContainer directly if using ReferenceArea.

### 8. **Line/Area Active Dot Appears Outside Graph**
Fixed in recent versions. Update to latest.

### 9. **Domain Doesn't Truncate Bar Values**
```tsx
// If domain max is 2000 but value is 2500, bar renders at 2500 (auto-scales)
// To enforce domain, filter data before passing to chart
<YAxis domain={[0, 2000]} />
```

### 10. **Legend Toggle Not Built-In**
Must implement custom legend click handling to show/hide series.

---

## General Dashboard Anti-Patterns

Avoid these common mistakes in analytics dashboards:

### Don't: Show Data Without Explanation
**Problem:** Chart appears with no title, axis labels, or context about what's being measured.
**Fix:** Every chart needs a clear title, axis labels, and units. Add descriptions for complex metrics.

### Don't: Use Generic Error Messages
**Problem:** "Error loading data" tells user nothing about what went wrong or how to fix it.
**Fix:** Specific errors: "Filter date range exceeds 1 year limit. Please select a shorter period."

### Don't: Assume Users Know Domain
**Problem:** Category names are abbreviations ("HSB", "BRF") without tooltips.
**Fix:** Use full names or add hover tooltips explaining terms.

### Don't: Flood with Metrics
**Problem:** Dashboard shows 30+ KPIs because "more data = more value."
**Fix:** Prioritize 5-7 key metrics. Progressive disclosure for deep dives.

### Don't: Bury Insights
**Problem:** User has to calculate "am I on budget?" by comparing numbers manually.
**Fix:** Show calculated insights: "15% over budget" with visual indicator.

### Don't: Make Filters Hidden
**Problem:** Active filters not visible, user doesn't know why data looks different than expected.
**Fix:** Show active filters prominently with "Reset" option.

---

## Confidence Assessment

| Category | Confidence | Notes |
|----------|-----------|-------|
| Recharts-specific issues | HIGH | Multiple confirmed GitHub issues with solutions |
| Performance with large datasets | HIGH | Well-documented problem with proven mitigations |
| URL state management | MEDIUM | Best practices exist but library-specific (nuqs vs manual) |
| Currency precision | HIGH | Standard financial calculation patterns |
| Mobile UX | MEDIUM | General patterns, not specific to expense analytics |
| React Query integration | MEDIUM | Patterns from official docs, not Recharts-specific |

---

## Sources

### Recharts Performance & Issues
- [Recharts is slow with large data · Issue #1146](https://github.com/recharts/recharts/issues/1146)
- [downsample large data set / LTTB algorithm · Issue #1356](https://github.com/recharts/recharts/issues/1356)
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)
- [Improving Recharts performance](https://belchior.hashnode.dev/improving-recharts-performance-clp5w295y000b0ajq8hu6cnmm)
- [CartesianAxis performance issues · Issue #1465](https://github.com/recharts/recharts/issues/1465)
- [A Practical Guide to Hacking the Recharts Library](https://www.olioapps.com/blog/graph-hacking)

### Recharts Gotchas
- [ResponsiveContainer not filling height · Issue #1545](https://github.com/recharts/recharts/issues/1545)
- [Chart's Height increasing infinitely · Issue #5388](https://github.com/recharts/recharts/issues/5388)
- [Recharts 3: Responsive container logs incorrect warning · Issue #6716](https://github.com/recharts/recharts/issues/6716)
- [A Guide to Recharts ResponsiveContainer](https://www.dhiwise.com/post/simplify-data-visualization-with-recharts-responsivecontainer)
- [Stacked Charts for Positive and Negative Numbers? · Issue #164](https://github.com/recharts/recharts/issues/164)
- [StackedBarChart with positive and negative value · Issue #621](https://github.com/recharts/recharts/issues/621)

### shadcn/ui Charts
- [Chart - shadcn/ui](https://ui.shadcn.com/docs/components/chart)
- [Support Recharts v3 · Issue #7669](https://github.com/shadcn-ui/ui/issues/7669)

### URL State Management
- [Your URL Is Your State](https://alfy.blog/2025/10/31/your-url-is-your-state.html)
- [Advanced React state management using URL parameters](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)
- [Why URL state matters: A guide to useSearchParams in React](https://blog.logrocket.com/url-state-usesearchparams/)
- [Why You Should Use nuqs](https://medium.com/@ruverd/why-you-should-use-nuqs-smarter-url-state-management-for-react-next-js-26a8b51ca1ac)
- [State in the url in React (the right way)](https://medium.com/@meric.emmanuel/state-in-the-url-in-react-the-right-way-3b031a3b183a)

### React Query
- [React Query Render Optimizations](https://tkdodo.eu/blog/react-query-render-optimizations)
- [Render Optimizations - TanStack Query](https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations)

### Currency & Precision
- [Handling Precision in Financial Calculations](https://medium.com/@stanislavbabenko/handling-precision-in-financial-calculations-in-net-a-deep-dive-into-decimal-and-common-pitfalls-1211cc5edd3b)
- [Currency Rounding - Everything you need to know](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/6662923736859-Currency-Rounding-Everything-you-need-to-know)
- [Handle Money in JavaScript: Financial Precision Without Losing a Cent](https://dev.to/benjamin_renoux/financial-precision-in-javascript-handle-money-without-losing-a-cent-1chc)
- [How to Avoid Problems with JavaScript's Weird Decimal Calculations](https://www.xjavascript.com/blog/avoiding-problems-with-javascript-s-weird-decimal-calculations/)

### Mobile & Dashboard UX
- [Mobile App UI/UX Design Trends 2026](https://www.letsgroto.com/blog/mobile-app-ui-ux-design-trends-2026-the-only-guide-you-ll-need)
- [Dashboard Design UX Patterns Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [7 Mobile UX/UI Design Patterns Dominating 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)
- [9 Dashboard Design Principles (2026)](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles)

### Responsive Design
- [Responsive Design Breakpoints in 2025](https://www.browserstack.com/guide/responsive-design-breakpoints)
- [6 Best JavaScript Charting Libraries for Dashboards in 2026](https://embeddable.com/blog/javascript-charting-libraries)

### State Management
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025)
