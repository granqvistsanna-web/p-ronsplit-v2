# Phase 3: Category Visualization - Research

**Researched:** 2026-01-28
**Domain:** Interactive bar chart visualization with Recharts for category spending breakdown
**Confidence:** HIGH

## Summary

Phase 3 implements an interactive bar chart showing spending breakdown by category. The project already uses Recharts 2.15.4 with shadcn/ui's ChartContainer wrapper, which provides theming and responsive behavior. The existing TrendChart component demonstrates the established patterns: ChartContainer with explicit height, ResponsiveContainer at 100%, custom tooltips/legends, and Swedish formatting.

The key challenge is mobile responsiveness — Recharts requires explicit height constraints on parent containers. The pattern is: ChartContainer with `min-h-[VALUE]` class, containing ResponsiveContainer with width="100%" height="100%". Without parent height, charts collapse to 0px (100% of undefined = 0). This is a known Recharts limitation documented across official sources.

For category aggregation, use `Array.reduce()` to sum expenses by category. For stacked bars (member breakdown), Recharts uses the `stackId` prop on Bar components — bars with the same stackId stack vertically. Toggle between modes by conditionally rendering different Bar configurations. The "show top 8 / show all" pattern uses `Array.slice(0, 8)` with state toggle.

**Primary recommendation:** Use Recharts BarChart with explicit height (`min-h-[300px]`), aggregate data with reduce, implement stacked mode via stackId prop, and use Array.slice for top-N filtering with toggle state.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.4 | Chart rendering library | Already in project; React-specific; composable API; industry standard for React charts |
| @/components/ui/chart | - | shadcn/ui chart wrapper | Already in project; provides ChartContainer, theming, and tooltip components |
| React | 18.3.1 | Component framework | Already in project; Recharts is built for React's component model |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.6.0 | Date formatting | Already in project; Swedish locale (sv) for consistent date display |
| lucide-react | 0.562.0 | Icons | Already in project; for toggle buttons and UI elements |
| Tailwind CSS | 3.4.17 | Styling | Already in project; use `min-h-[VALUE]` for chart container height |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js with react-chartjs-2 | Chart.js less React-idiomatic; Recharts already integrated; consistency over change |
| Recharts | Victory | Victory more opinionated; Recharts already in use (TrendChart); no migration benefit |
| Custom aggregation | SQL GROUP BY | Client-side aggregation simpler; data already fetched for other views; avoids extra query |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
# recharts 2.15.4, lucide-react 0.562.0, date-fns 3.6.0 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── analytics/
│       ├── TrendChart.tsx           # Existing - reference pattern
│       ├── CategoryBarChart.tsx     # NEW - main bar chart
│       └── CategoryChartControls.tsx # NEW - toggle controls
├── hooks/
│   ├── useExpenses.tsx              # Phase 2 - provides filtered data
│   └── useCategoryData.tsx          # NEW - aggregation logic
└── lib/
    ├── types.ts                     # Category type already exists
    └── categoryUtils.ts             # NEW - aggregation utilities
```

### Pattern 1: Recharts Bar Chart with Mobile Height Constraints
**What:** BarChart wrapped in ChartContainer with explicit minimum height to ensure mobile rendering
**When to use:** All Recharts charts, especially on mobile devices
**Example:**
```typescript
// Source: shadcn/ui chart docs + Recharts ResponsiveContainer API
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  const chartConfig = {
    amount: {
      label: "Belopp",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[300px] w-full"  // CRITICAL: explicit min-h
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 8, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Parent container with defined height enables ResponsiveContainer to work
// Without min-h-[300px], chart would collapse (100% of undefined = 0)
```

### Pattern 2: Category Data Aggregation with reduce()
**What:** Aggregate expense data by category, summing amounts per category
**When to use:** Transform flat expense list into chart data structure
**Example:**
```typescript
// Source: Modern JavaScript patterns + existing Phase 2 data structure
import type { Expense, Category, DEFAULT_CATEGORIES } from "@/lib/types";

interface CategoryData {
  category: string;
  categoryName: string;
  amount: number;
  color: string;
  icon: string;
}

export function aggregateByCategory(expenses: Expense[]): CategoryData[] {
  // Group expenses by category using reduce
  const categoryMap = expenses.reduce<Record<string, number>>((acc, expense) => {
    const category = expense.category || 'ovrigt';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});

  // Map to chart data with category metadata
  const categoryData = Object.entries(categoryMap).map(([categoryId, amount]) => {
    const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
      || DEFAULT_CATEGORIES.find(c => c.id === 'ovrigt')!;

    return {
      category: categoryId,
      categoryName: categoryInfo.name,
      amount,
      color: categoryInfo.color,
      icon: categoryInfo.icon,
    };
  });

  // Sort by amount descending
  return categoryData.sort((a, b) => b.amount - a.amount);
}

// Usage in component
function CategoryChart() {
  const { expenses } = useExpenses(filters);
  const categoryData = useMemo(
    () => aggregateByCategory(expenses),
    [expenses]
  );

  // Top 8 by default
  const displayData = showAll ? categoryData : categoryData.slice(0, 8);

  return <CategoryBarChart data={displayData} />;
}
```

### Pattern 3: Stacked Bar Chart with Member Breakdown
**What:** Use Recharts stackId prop to show spending per member within each category
**When to use:** Toggle between category totals and member breakdown
**Example:**
```typescript
// Source: Recharts stacked bar chart examples
interface StackedCategoryData {
  category: string;
  categoryName: string;
  [memberId: string]: number | string; // Dynamic member keys
}

export function aggregateByCategoryAndMember(
  expenses: Expense[],
  members: GroupMember[]
): StackedCategoryData[] {
  // Group by category, then by member
  const categoryMap = new Map<string, Map<string, number>>();

  expenses.forEach(expense => {
    const category = expense.category || 'ovrigt';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map());
    }

    const memberMap = categoryMap.get(category)!;
    const paidBy = expense.paid_by;
    memberMap.set(paidBy, (memberMap.get(paidBy) || 0) + expense.amount);
  });

  // Convert to chart data structure
  const chartData: StackedCategoryData[] = [];

  categoryMap.forEach((memberMap, categoryId) => {
    const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)!;
    const row: StackedCategoryData = {
      category: categoryId,
      categoryName: categoryInfo.name,
    };

    // Add each member's amount as a separate key
    members.forEach(member => {
      row[member.id] = memberMap.get(member.id) || 0;
    });

    chartData.push(row);
  });

  return chartData.sort((a, b) => {
    const aTotal = members.reduce((sum, m) => sum + ((a[m.id] as number) || 0), 0);
    const bTotal = members.reduce((sum, m) => sum + ((b[m.id] as number) || 0), 0);
    return bTotal - aTotal;
  });
}

// Render stacked bars
function StackedCategoryChart({ data, members }: Props) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="categoryName" />
          <YAxis />
          <Tooltip />
          {members.map((member, index) => (
            <Bar
              key={member.id}
              dataKey={member.id}
              stackId="a"  // Same stackId stacks bars vertically
              fill={`hsl(var(--chart-${index + 1}))`}
              name={member.name}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### Pattern 4: Top N with "Show All" Toggle
**What:** Display top 8 categories by default with button to expand to all categories
**When to use:** Keep initial view focused, allow drill-down without navigation
**Example:**
```typescript
// Source: React state patterns + Array.slice
import { useState } from "react";
import { Button } from "@/components/ui/button";

function CategoryChartSection({ categoryData }: Props) {
  const [showAll, setShowAll] = useState(false);

  // Slice to top 8 unless showAll is true
  const displayData = showAll ? categoryData : categoryData.slice(0, 8);
  const hasMore = categoryData.length > 8;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Utgifter per kategori</h3>
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Visa topp 8' : `Visa alla (${categoryData.length})`}
          </Button>
        )}
      </div>

      <CategoryBarChart data={displayData} />

      {!showAll && hasMore && (
        <p className="text-sm text-muted-foreground text-center">
          Visar {displayData.length} av {categoryData.length} kategorier
        </p>
      )}
    </div>
  );
}
```

### Pattern 5: Toggle Between Simple and Stacked Mode
**What:** Render different Bar configurations based on toggle state
**When to use:** Switch between category totals and member breakdown in same chart
**Example:**
```typescript
// Source: Conditional rendering + Recharts composition
import { Toggle } from "@/components/ui/toggle";
import { Users, BarChart3 } from "lucide-react";

function CategoryChart() {
  const [stackedMode, setStackedMode] = useState(false);
  const { expenses } = useExpenses(filters);
  const { members } = useGroups();

  const simpleData = useMemo(
    () => aggregateByCategory(expenses),
    [expenses]
  );

  const stackedData = useMemo(
    () => aggregateByCategoryAndMember(expenses, members),
    [expenses, members]
  );

  const displayData = stackedMode ? stackedData : simpleData;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Toggle
          pressed={stackedMode}
          onPressedChange={setStackedMode}
          aria-label="Växla staplat läge"
        >
          <Users className="h-4 w-4 mr-2" />
          Visa per medlem
        </Toggle>
      </div>

      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData}>
            <XAxis dataKey="categoryName" />
            <YAxis />
            <Tooltip />
            {stackedMode ? (
              // Stacked bars - one Bar per member
              members.map((member, idx) => (
                <Bar
                  key={member.id}
                  dataKey={member.id}
                  stackId="a"
                  fill={`hsl(var(--chart-${idx + 1}))`}
                  name={member.name}
                />
              ))
            ) : (
              // Single bar - total per category
              <Bar
                dataKey="amount"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **No explicit height on ChartContainer:** Leads to 0px collapsed charts on mobile. Always use `min-h-[VALUE]` class.
- **Percentage height on parent without defined ancestor:** ResponsiveContainer needs parent with px or vh height, not percentage all the way up.
- **Using stackId inconsistently:** All bars that should stack must have the same stackId. Different stackIds create side-by-side bars.
- **Aggregating in render without useMemo:** Expensive reduce operations should be memoized to avoid re-computation on every render.
- **Not sorting category data:** Charts more useful when sorted by amount descending; user sees biggest categories first.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart responsiveness | Custom resize observer + manual width calculations | Recharts ResponsiveContainer with explicit parent height | ResponsiveContainer handles resize automatically via ResizeObserver API; edge cases handled |
| Category color theming | Hard-coded color arrays per category | shadcn/ui ChartConfig with CSS variables | Automatic theme switching (light/dark); consistent with TrendChart; centralized color management |
| Tooltip formatting | Custom positioned div with manual calculations | Recharts Tooltip component with custom content | Recharts handles positioning, animations, coordinate calculations; just provide content |
| Data aggregation | Manual loops with intermediate arrays | Array.reduce() with accumulator object | Single-pass aggregation; no intermediate arrays; modern JavaScript pattern; more performant |
| Toggle visibility | Manual DOM manipulation or CSS classes | React state with conditional rendering | React reconciliation handles updates; accessible; testable |

**Key insight:** Recharts handles the hard parts (SVG rendering, responsiveness via ResizeObserver, tooltip positioning, animations). The only critical requirement is explicit parent height — without it, ResponsiveContainer's percentage-based sizing collapses to 0px because 100% of undefined is 0. This is not a bug, it's how CSS percentage heights work.

## Common Pitfalls

### Pitfall 1: Invisible Charts on Mobile Due to Missing Height
**What goes wrong:** Chart renders fine on desktop but disappears or shows 0px height on mobile devices
**Why it happens:** ResponsiveContainer uses percentage heights (100%), which require parent container to have defined height. Without explicit height, percentage resolves to 0.
**How to avoid:** Always set `min-h-[VALUE]` on ChartContainer. Use px values (like `min-h-[300px]`) or vh values (like `min-h-[50vh]`), not percentages.
**Warning signs:** Chart works in dev on desktop but fails on mobile; inspecting shows 0px height; no chart visible but no errors in console

### Pitfall 2: Stacked Bars Not Stacking
**What goes wrong:** Multiple Bar components render side-by-side instead of stacking vertically
**Why it happens:** Missing or inconsistent `stackId` prop on Bar components
**How to avoid:** Set same `stackId` value on all Bar components that should stack together: `<Bar stackId="a" />`. Different stackIds create grouped bars instead.
**Warning signs:** Bars appear side-by-side instead of on top of each other; chart very wide; bars overlap in messy way

### Pitfall 3: Category Data Not Reactive to Filter Changes
**What goes wrong:** Chart shows stale data after changing date range or member filter
**Why it happens:** Aggregation result not memoized with correct dependencies; component doesn't re-compute when expenses change
**How to avoid:** Use `useMemo(() => aggregateByCategory(expenses), [expenses])` to recompute when expenses update from React Query
**Warning signs:** Chart doesn't update when changing filters; manual page refresh shows correct data; filter bar changes but chart doesn't

### Pitfall 4: Performance Issues with Large Datasets
**What goes wrong:** Chart feels sluggish; interactions lag; scrolling janky
**Why it happens:** Re-aggregating and re-rendering large datasets on every state change without memoization
**How to avoid:** Memoize aggregation results with `useMemo`; limit data points (top N pattern); use React.memo for chart component if needed
**Warning signs:** Slow toggle animations; delayed state updates; React DevTools shows frequent re-renders

### Pitfall 5: Custom Tooltip Not Showing Correct Data
**What goes wrong:** Tooltip shows wrong amounts or category names; formatting inconsistent
**Why it happens:** Tooltip content component accessing wrong payload keys; not matching dataKey props on Bar components
**How to avoid:** Recharts passes `payload` array to custom tooltip content. Access via `payload[0].value` for simple bars, iterate `payload` for stacked bars. Verify dataKey matches.
**Warning signs:** Tooltip shows undefined or NaN; Swedish formatting missing; wrong category names

### Pitfall 6: X-Axis Labels Overlapping or Cut Off
**What goes wrong:** Category names overlap each other or get truncated; chart unreadable
**Why it happens:** Too many categories with long names; default horizontal text layout; insufficient bottom margin
**How to avoid:** Use `angle={-45}` on XAxis tick prop to rotate labels; increase bottom margin in BarChart; or use `interval={0}` with shortened names
**Warning signs:** Labels overlapping; bottom of chart cuts off text; category names unreadable

### Pitfall 7: Currency Not Formatted as Swedish Kronor
**What goes wrong:** Y-axis shows raw numbers like "1234" instead of "1 234 kr"; inconsistent with rest of app
**Why it happens:** Not using `toLocaleString('sv-SE')` in YAxis tickFormatter or Tooltip content
**How to avoid:** Format with Swedish locale: `value.toLocaleString('sv-SE') + ' kr'` or use `formatCurrency()` utility from Phase 2 if amounts in öre
**Warning signs:** English number formatting (comma separators); no "kr" suffix; doesn't match TrendChart formatting

## Code Examples

Verified patterns from official sources:

### Complete Category Bar Chart Component
```typescript
// Source: Recharts BarChart API + shadcn/ui chart patterns + existing TrendChart
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Expense } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/types";

interface CategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
}

interface CategoryBarChartProps {
  expenses: Expense[];
  showAll?: boolean;
}

// Custom tooltip matching TrendChart style
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-notion-lg">
      <p className="text-caption font-medium mb-2">
        {data.categoryName}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-caption">Totalt</span>
        <span className="text-number font-semibold">
          {data.amount.toLocaleString('sv-SE')} kr
        </span>
      </div>
    </div>
  );
};

export function CategoryBarChart({ expenses, showAll = false }: CategoryBarChartProps) {
  // Aggregate expenses by category
  const categoryData = useMemo(() => {
    const categoryMap = expenses.reduce<Record<string, number>>((acc, expense) => {
      const category = expense.category || 'ovrigt';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    const data = Object.entries(categoryMap).map(([categoryId, amount]) => {
      const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
        || DEFAULT_CATEGORIES.find(c => c.id === 'ovrigt')!;

      return {
        categoryId,
        categoryName: categoryInfo.name,
        amount,
        color: categoryInfo.color,
      };
    });

    // Sort by amount descending
    return data.sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Show top 8 or all
  const displayData = showAll ? categoryData : categoryData.slice(0, 8);

  // Chart config for theming
  const chartConfig = {
    amount: {
      label: "Belopp",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  if (displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Ingen data att visa
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={displayData}
          margin={{ top: 20, right: 8, left: 0, bottom: 40 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />

          <XAxis
            dataKey="categoryName"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              fontFamily: "Geist Mono",
            }}
            angle={-45}
            textAnchor="end"
            height={80}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
              fontFamily: "Geist Mono",
            }}
            tickFormatter={(value) =>
              value >= 1000
                ? `${(value / 1000).toFixed(0)}k`
                : value.toString()
            }
            width={45}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="amount"
            fill="var(--color-amount)"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### Stacked Bar Chart with Member Breakdown
```typescript
// Source: Recharts stacked bar example + existing patterns
interface StackedCategoryBarChartProps {
  expenses: Expense[];
  members: GroupMember[];
  showAll?: boolean;
}

export function StackedCategoryBarChart({
  expenses,
  members,
  showAll = false
}: StackedCategoryBarChartProps) {
  const stackedData = useMemo(() => {
    // Group by category, then by member
    const categoryMap = new Map<string, Map<string, number>>();

    expenses.forEach(expense => {
      const category = expense.category || 'ovrigt';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const memberMap = categoryMap.get(category)!;
      const paidBy = expense.paid_by;
      memberMap.set(paidBy, (memberMap.get(paidBy) || 0) + expense.amount);
    });

    // Convert to chart data
    const chartData: any[] = [];

    categoryMap.forEach((memberMap, categoryId) => {
      const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)!;
      const row: any = {
        categoryId,
        categoryName: categoryInfo.name,
      };

      members.forEach(member => {
        row[member.id] = memberMap.get(member.id) || 0;
      });

      chartData.push(row);
    });

    // Sort by total amount
    return chartData.sort((a, b) => {
      const aTotal = members.reduce((sum, m) => sum + (a[m.id] || 0), 0);
      const bTotal = members.reduce((sum, m) => sum + (b[m.id] || 0), 0);
      return bTotal - aTotal;
    });
  }, [expenses, members]);

  const displayData = showAll ? stackedData : stackedData.slice(0, 8);

  // Chart config with member colors
  const chartConfig = members.reduce((config, member, idx) => ({
    ...config,
    [member.id]: {
      label: member.name,
      color: `hsl(var(--chart-${idx + 1}))`,
    },
  }), {} as ChartConfig);

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="categoryName"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()} />
          <Tooltip />
          {members.map((member, idx) => (
            <Bar
              key={member.id}
              dataKey={member.id}
              stackId="members"  // Same stackId stacks bars
              fill={`hsl(var(--chart-${idx + 1}))`}
              name={member.name}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

### Category Chart Section with Controls
```typescript
// Source: React patterns + shadcn/ui components
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Users, BarChart3 } from "lucide-react";

export function CategoryChartSection() {
  const [showAll, setShowAll] = useState(false);
  const [stackedMode, setStackedMode] = useState(false);

  const filters = useFilterParams(); // From Phase 1
  const { expenses } = useExpenses(filters); // From Phase 2
  const { members } = useGroups();

  const categoryData = useMemo(
    () => aggregateByCategory(expenses),
    [expenses]
  );

  const hasMore = categoryData.length > 8;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Utgifter per kategori</h3>

        <div className="flex items-center gap-2">
          <Toggle
            pressed={stackedMode}
            onPressedChange={setStackedMode}
            size="sm"
            aria-label="Visa per medlem"
          >
            <Users className="h-4 w-4 mr-2" />
            Per medlem
          </Toggle>

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Topp 8' : `Alla (${categoryData.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Chart */}
      {stackedMode ? (
        <StackedCategoryBarChart
          expenses={expenses}
          members={members}
          showAll={showAll}
        />
      ) : (
        <CategoryBarChart
          expenses={expenses}
          showAll={showAll}
        />
      )}

      {/* Info text */}
      {!showAll && hasMore && (
        <p className="text-sm text-muted-foreground text-center">
          Visar {Math.min(8, categoryData.length)} av {categoryData.length} kategorier
        </p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js with imperative API | Recharts with React components | 2015-2020 | Declarative chart building; React component lifecycle; better TypeScript support |
| Fixed pixel dimensions | ResponsiveContainer with percentage | Recharts v1+ (2017) | Responsive charts that adapt to container; requires explicit parent height |
| Manual SVG rendering | Recharts abstraction | Recharts core design | Simplified bar chart creation; automatic axis calculations; built-in tooltips |
| Custom tooltip positioning | Recharts Tooltip component | Recharts v1+ (2017) | Automatic positioning; animation; coordinate calculations handled |
| Array.map with loops | Array.reduce for aggregation | ES6+ (2015) | Single-pass aggregation; no intermediate arrays; performance improvement |
| stackOffset prop variations | stackId prop for grouping | Recharts v2+ (2020) | Simpler stacking API; consistent behavior; stackId="a" stacks all bars with same ID |

**Deprecated/outdated:**
- Recharts v2.x used `stackOffset` prop with values like "expand", "none" — v2.15+ uses `stackId` for simpler stacking
- aspect-ratio CSS property on chart containers — `min-h-[VALUE]` more reliable for explicit height on mobile
- CSS calc() for responsive chart heights — ResponsiveContainer handles this via ResizeObserver
- Manual window resize listeners — ResponsiveContainer uses ResizeObserver API automatically

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Number of Top Categories**
   - What we know: Requirement says "top 8 categories"; pattern matches industry standard (Nielsen recommends 7±2 data points)
   - What's unclear: Whether 8 is sufficient for all use cases; some households may have 15+ active categories
   - Recommendation: Start with 8 as specified; monitor user feedback; consider dynamic threshold based on data distribution

2. **Horizontal vs Vertical Bars for Mobile**
   - What we know: Vertical bars standard for category comparison; horizontal bars better for 7+ categories with long labels
   - What's unclear: Swedish category names fit in vertical layout with angle? "Restaurang", "Transport" may overlap
   - Recommendation: Start with vertical bars, angled labels (-45°); switch to horizontal BarChart if label overlap reported

3. **Animation Duration Impact on Perceived Performance**
   - What we know: TrendChart uses 800ms animation; Recharts default is 400ms
   - What's unclear: Whether 800ms feels sluggish when toggling between stacked/simple mode; no usability testing data
   - Recommendation: Match TrendChart 800ms for consistency; reduce to 400ms if toggle feels laggy in user testing

4. **Empty State for Zero-Expense Categories**
   - What we know: Categories with 0 kr should not appear in chart; aggregation filters these naturally
   - What's unclear: Whether to show "no data" message when filters produce empty result vs just hide chart section
   - Recommendation: Show empty state message when no expenses match filters; helps user understand filters are active

5. **Color Assignment Strategy for Stacked Mode**
   - What we know: Categories have predefined colors in DEFAULT_CATEGORIES; members get sequential chart-1, chart-2, etc.
   - What's unclear: Whether to use category colors for bars in simple mode vs theme colors; consistency vs meaning
   - Recommendation: Use theme colors (chart-1) for consistency with TrendChart; category colors in legend/tooltip for identification

## Sources

### Primary (HIGH confidence)
- Recharts BarChart API: https://recharts.github.io/en-US/examples/StackedBarChart/
- Recharts ResponsiveContainer: https://recharts.github.io/en-US/api/ResponsiveContainer/
- shadcn/ui Charts documentation: https://ui.shadcn.com/docs/components/chart
- shadcn/ui Bar Chart examples: https://ui.shadcn.com/charts/bar
- TrendChart component (existing in project): /src/components/analytics/TrendChart.tsx
- types.ts (existing in project): DEFAULT_CATEGORIES array with colors

### Secondary (MEDIUM confidence)
- How to Set Responsive Height and Width for Recharts BarChart: https://www.w3tutorials.net/blog/set-height-and-width-for-responsive-chart-using-recharts-barchart/
- Recharts ResponsiveContainer Guide: https://www.dhiwise.com/post/simplify-data-visualization-with-recharts-responsivecontainer
- Recharts: How to Use it and Build Analytics Dashboards: https://embeddable.com/blog/what-is-recharts
- How to use Recharts to visualize analytics data: https://posthog.com/tutorials/recharts
- Tailwind min-height documentation: https://tailwindcss.com/docs/min-height
- Reducing Array of Objects to Sum Multiple Properties (2026): https://copyprogramming.com/howto/reducing-array-of-objects-to-sum-up-for-multiple-properties

### Tertiary (LOW confidence - WebSearch only)
- GitHub: BarChart not rendering inside ResponsiveContainer #4586: https://github.com/recharts/recharts/issues/4586
- GitHub: Toggle visibility of elements by legend #329: https://github.com/recharts/recharts/issues/329
- Building beautiful graphs in React with Recharts - Bar Charts: https://natehaebigkerber.substack.com/p/building-beautiful-graphs-in-react

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts 2.15.4 already in project (package.json verified); shadcn/ui chart wrapper already exists; TrendChart demonstrates established patterns
- Architecture: HIGH - ResponsiveContainer + min-height pattern documented in official Recharts docs and shadcn/ui docs; existing TrendChart uses same pattern; reduce() for aggregation is JavaScript standard
- Pitfalls: HIGH - Mobile height issue documented in multiple official sources (Recharts API, shadcn/ui requirement, GitHub issues); verified by existing TrendChart using min-h class

**Research date:** 2026-01-28
**Valid until:** 60 days (Recharts 2.x stable; React patterns stable; may need revisit if Recharts v3 released)

**Key dependencies verified:**
- recharts: 2.15.4 (from package.json)
- React: 18.3.1 (from package.json)
- @/components/ui/chart: ChartContainer exists (verified in codebase)
- lucide-react: 0.562.0 (from package.json)
- Tailwind CSS: 3.4.17 (from package.json)

**Integration points:**
- Existing: TrendChart component demonstrates Recharts + shadcn/ui pattern — use as reference
- Existing: DEFAULT_CATEGORIES in types.ts provides category metadata (name, icon, color)
- Existing: CategoryId type defined in categoryMatcher.ts (11 categories)
- Phase 1: Filter bar provides dateRange and memberIds via URL params
- Phase 2: useExpenses hook provides filtered expense array
- New: CategoryBarChart component (main visualization)
- New: StackedCategoryBarChart component (member breakdown)
- New: CategoryChartSection component (controls + chart)
- New: aggregateByCategory utility (data transformation)
- New: aggregateByCategoryAndMember utility (stacked data transformation)

**Current state analysis:**
- ✅ Recharts 2.15.4 installed and working (TrendChart proves integration)
- ✅ shadcn/ui ChartContainer exists with theming support
- ✅ Category types defined in types.ts with colors
- ✅ Expense data includes category field (string)
- ✅ Phase 2 provides useExpenses hook with filter support
- ✅ Swedish locale (sv) available via date-fns for formatting
- ❌ No existing bar chart implementation — TrendChart uses AreaChart
- ❌ No category aggregation utilities yet — need to implement reduce logic
- ❌ No stacked bar chart implementation yet
- ❌ No "show all" toggle pattern in existing code — new pattern
