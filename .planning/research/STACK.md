# Technology Stack: Analytics Dashboard Enhancement

**Project:** Päronsplit v2 - Analytics Dashboard Features
**Researched:** 2026-01-27
**Context:** Adding date range filters, URL persistence, drill-down panels, and budget tracking to existing React/TypeScript analytics dashboard

## Executive Summary

**Verdict:** Your existing stack (React 18, TypeScript, Vite, Recharts, shadcn/ui, Supabase, React Query, react-router-dom, date-fns) is **EXCELLENT** for these enhancements. Only ONE new library is recommended (nuqs for URL state), and TWO copy-paste components are needed. Avoid dependency bloat by leveraging what you already have.

**Confidence:** HIGH - All recommendations verified against official documentation and current (2026) community best practices.

---

## Recommended Additions

### 1. URL State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **nuqs** | ^2.x (latest) | Type-safe URL query parameter state | Industry standard for URL state in React; used by Supabase, Vercel, Clerk; 1M+ weekly downloads; only 6 kB gzipped |

**Rationale:**
- React Router's `useSearchParams` works but lacks type safety and requires manual serialization
- nuqs provides `useState`-like API that auto-syncs with URL: `const [dateRange, setDateRange] = useQueryState('range', parseAsString)`
- Built-in parsers for dates, numbers, booleans eliminate manual string conversion
- Throttling/debouncing prevents browser history spam during high-frequency updates
- Works seamlessly with react-router-dom v6 (your current version: ^6.30.1)

**Installation:**
```bash
npm install nuqs
```

**Alternative Considered:**
- **react-router-dom useSearchParams alone** - Free but requires manual type conversion, serialization, and state sync logic. More boilerplate. Choose this if you want zero dependencies, but nuqs is worth the 6 kB.

---

### 2. Date Range Filter Components

| Component | Type | Purpose | Why |
|-----------|------|---------|-----|
| **Date Range Picker for shadcn** | Copy-paste | Pre-built date range picker with presets | Production-ready component with "Last 7 days", "Last 30 days", "This month", YTD presets; uses your existing react-day-picker and date-fns |
| **Custom preset logic** | Custom code | Date range calculation helpers | Use date-fns (already installed v3.6.0) functions for YTD, MTD, Last N days calculations |

**What You Already Have (USE THESE):**
- **react-day-picker** (v8.10.1) - Already installed! Supports range selection mode natively
- **date-fns** (v3.6.0) - Already installed! Perfect for date calculations
- **shadcn/ui Calendar** - Already installed! Built on react-day-picker

**What to Add:**
Copy the [Date Range Picker for shadcn](https://github.com/johnpolacek/date-range-picker-for-shadcn) component (by John Polacek) into your project. This is NOT an npm package - it's a copy-paste component following shadcn philosophy.

**Features:**
- Dropdown interface for date range selection
- Built-in presets (customizable): Last 7/14/30 days, This month, Last month, This year
- Text entry + calendar selection
- Optional comparison mode (period-over-period)
- TypeScript + Tailwind CSS
- Uses your existing Calendar, Popover, Button components

**Installation Steps:**
1. Ensure shadcn dependencies are installed (already done): Button, Calendar, Label, Popover
2. Install icons: `npm install @radix-ui/react-icons`
3. Copy component files from [GitHub repo](https://github.com/johnpolacek/date-range-picker-for-shadcn/tree/main/src)
4. Customize presets to add "YTD" using date-fns: `startOfYear(new Date())`

**Custom Preset Examples (using date-fns):**
```typescript
import { subDays, startOfMonth, startOfYear, endOfMonth } from 'date-fns';

const presets = [
  { label: "Last 7 days", range: { from: subDays(new Date(), 7), to: new Date() } },
  { label: "Last 30 days", range: { from: subDays(new Date(), 30), to: new Date() } },
  { label: "This month", range: { from: startOfMonth(new Date()), to: new Date() } },
  { label: "YTD", range: { from: startOfYear(new Date()), to: new Date() } },
];
```

**Alternative Considered:**
- **Build from scratch with react-day-picker** - Possible but reinventing the wheel. The copy-paste component saves 4-6 hours of development.
- **Other date range pickers** (MUI, React Suite, Mantine) - Would require new dependencies. Stick with shadcn ecosystem.

---

### 3. Responsive Drill-Down Panel

| Component | Type | Purpose | Why |
|-----------|------|---------|-----|
| **Sheet (Radix Dialog)** | Already installed | Desktop side panel | Already have `@radix-ui/react-dialog` ^1.1.14 |
| **Drawer (vaul)** | Already installed | Mobile bottom sheet | Already have `vaul` ^0.9.9 |
| **useIsMobile hook** | Already exists | Responsive breakpoint detection | Found at `/src/hooks/use-mobile.tsx` - 768px breakpoint |

**What You Already Have (USE THESE):**
- **Sheet component** (`/src/components/ui/sheet.tsx`) - Radix Dialog-based, supports left/right/top/bottom sides
- **Drawer component** (`/src/components/ui/drawer.tsx`) - Vaul-based bottom sheet with drag handle
- **useIsMobile hook** (`/src/hooks/use-mobile.tsx`) - Custom hook, 768px breakpoint

**Pattern to Use:**
Conditional rendering based on screen size. This is the **2026 best practice** for responsive dialog/drawer patterns.

```typescript
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

function DrillDownPanel({ open, onClose, children }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent>{children}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        {children}
      </SheetContent>
    </Sheet>
  );
}
```

**Why This Works:**
- Sheet (Radix Dialog) on desktop: Slides in from right, maintains context, keyboard accessible
- Drawer (vaul) on mobile: Slides up from bottom, draggable, native feel
- useIsMobile: Clean breakpoint detection with resize handling
- Used by Supabase, Vercel, and other production apps

**Alternative Considered:**
- **Single Dialog component with fullScreen mode** - Less mobile-friendly UX
- **React Portals + custom positioning** - Reinventing Radix accessibility
- **MUI Drawer/Dialog** - Would add 300+ kB bundle size

---

### 4. Budget Tracking Progress Bars

| Component | Type | Purpose | Why |
|-----------|------|---------|-----|
| **Progress** | Already installed | Horizontal progress bars | Already have `@radix-ui/react-progress` ^1.1.7 |
| **Custom multi-value logic** | Custom code | Multiple budget categories | Build on top of existing Progress component |

**What You Already Have (USE THIS):**
- **Progress component** (`/src/components/ui/progress.tsx`) - Radix Progress primitive, fully styled with Tailwind

**Implementation Pattern:**
```typescript
import { Progress } from "@/components/ui/progress";

function BudgetTracker({ spent, budget, category }) {
  const percentage = (spent / budget) * 100;
  const isOverBudget = percentage > 100;
  const isWarning = percentage > 80;

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span>{category}</span>
        <span>{spent.toLocaleString()} kr / {budget.toLocaleString()} kr</span>
      </div>
      <Progress
        value={Math.min(percentage, 100)}
        className={cn(
          isOverBudget && "bg-red-100 [&>div]:bg-red-500",
          isWarning && !isOverBudget && "bg-amber-100 [&>div]:bg-amber-500"
        )}
      />
      <p className="text-xs text-muted-foreground mt-1">
        {percentage.toFixed(0)}% of budget
      </p>
    </div>
  );
}
```

**Color-Coded Budget States:**
- Green (< 80%): On track
- Amber (80-100%): Warning
- Red (> 100%): Over budget

**For Multiple Categories:**
Iterate over budget array and render individual Progress bars with per-category tracking.

**Alternative Considered:**
- **Tremor React** - Provides pre-built budget/KPI components but adds 50+ kB bundle. Your current Progress component is sufficient.
- **Custom SVG progress rings** - Circular progress looks nice but horizontal bars are more scannable for budget lists.

---

## Chart Capabilities (Already Sufficient)

| Library | Version | Current Usage | Enhancement Capabilities |
|---------|---------|---------------|-------------------------|
| **Recharts** | ^2.15.4 | Line, bar, donut charts | Supports drill-down via onClick handlers; tooltip customization; responsive containers |

**What You Already Have:**
- **TrendChart** - 6-month line chart with income/expenses
- **CategoryDonut** - Pie chart for category breakdown
- **ComparisonBar** - Bar chart for monthly comparison

**For Drill-Down:**
Recharts supports `onClick` events on all chart elements. Example:

```typescript
<Bar
  dataKey="expenses"
  onClick={(data) => openDrillDown(data.payload)}
/>
```

**No New Charts Needed** - Your existing Recharts setup handles the requested features.

**Alternative Considered:**
- **Chart.js** - More chart types but less React-friendly
- **Apache ECharts** - Powerful but 600+ kB bundle
- **Victory** - Good but Recharts has better DX in React

---

## State Management (Already Sufficient)

| Library | Version | Current Usage | Enhancement Usage |
|---------|---------|---------------|-------------------|
| **React Query** | ^5.83.0 | Data fetching, caching | Continue using for expense/income queries; cache works with URL filters |
| **React useState/useCallback** | Built-in | Local UI state | Filter state, drill-down panel open/closed |

**No Redux/Zustand Needed** - Your analytics features are UI state (filters, panels) + server state (data). React Query + useState is the correct choice.

---

## What NOT to Add (Avoid Dependency Bloat)

| Library | Why NOT |
|---------|---------|
| **Redux/Zustand** | Overkill for filter state. URL state (nuqs) + useState is cleaner. |
| **react-query-sync-storage-persister** | Already installed (^5.90.18) but URL state is better for shareability |
| **Lodash** | Already have native JS methods. date-fns covers date utils. |
| **Moment.js** | Deprecated. You have date-fns (modern, tree-shakeable). |
| **Framer Motion** | Already installed (^12.23.26) but don't use for analytics (Radix animations sufficient) |
| **Tailwind Plugins** | @tailwindcss/typography already installed. Don't need more. |
| **Tremor/Mantine/Ant Design** | Duplicate functionality with shadcn/ui. Avoid mixing UI libraries. |

---

## Installation Commands

```bash
# New dependencies
npm install nuqs @radix-ui/react-icons

# Verify existing dependencies (already installed)
npm list react-day-picker date-fns recharts vaul @radix-ui/react-progress
```

**Total new bundle size:** ~8 kB gzipped (nuqs 6 kB + radix-icons 2 kB)

---

## Implementation Checklist

- [ ] Install nuqs for URL state management
- [ ] Install @radix-ui/react-icons for date picker icons
- [ ] Copy Date Range Picker component from GitHub repo
- [ ] Create custom date presets (YTD, MTD, Last N days) using date-fns
- [ ] Build responsive DrillDownPanel using existing Sheet/Drawer + useIsMobile
- [ ] Add URL state sync with nuqs for date range filter
- [ ] Create BudgetTracker component using existing Progress component
- [ ] Add onClick handlers to Recharts for drill-down navigation
- [ ] Set up budget data model in Supabase (if not exists)
- [ ] Test URL deep linking (share filtered dashboard URLs)

---

## Data Model Considerations (Supabase)

For budget tracking, you'll need a new table or extend existing schema:

```sql
-- Option 1: Budget table (recommended)
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  category TEXT NOT NULL,
  monthly_limit DECIMAL NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Option 2: Add budget field to existing categories
-- (if categories are predefined)
ALTER TABLE expense_categories
ADD COLUMN monthly_budget DECIMAL;
```

Budget tracking requires storing per-category limits and comparing against actual expenses from the `expenses` table.

---

## Performance Considerations

**React Query Caching:**
- Keep current `staleTime` and `cacheTime` settings
- URL filter changes should invalidate queries only when date range changes
- Use query keys that include date range: `['expenses', householdId, dateRange]`

**Recharts Optimization:**
- Your current dataset size (personal finance app) is small (< 1000 data points)
- Recharts performs well with this scale
- If data grows, implement date range pagination (e.g., max 3 months at once)

**Date Range Picker Performance:**
- react-day-picker is performant for single-month views
- For dual-month displays (range picker), keep default behavior
- Avoid showing > 2 months simultaneously

---

## TypeScript Types

```typescript
// Date range state
interface DateRange {
  from: Date;
  to: Date;
}

// Budget tracking
interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
}

// Drill-down data
interface DrillDownData {
  category: string;
  expenses: Array<{
    id: string;
    date: Date;
    amount: number;
    description: string;
  }>;
  total: number;
}
```

---

## Architecture Pattern

```
┌─────────────────────────────────────────┐
│  Analytics Page (Analys.tsx)            │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ DateRangeFilter (with presets)   │   │
│  │ ↓ syncs with ↓                   │   │
│  │ URL State (nuqs)                 │   │
│  └──────────────────────────────────┘   │
│            ↓                             │
│  ┌──────────────────────────────────┐   │
│  │ React Query (filtered data)      │   │
│  └──────────────────────────────────┘   │
│            ↓                             │
│  ┌──────────────────────────────────┐   │
│  │ Charts (Recharts)                │   │
│  │ - TrendChart                     │   │
│  │ - CategoryDonut (onClick)        │   │
│  │ - ComparisonBar                  │   │
│  └──────────────────────────────────┘   │
│            ↓                             │
│  ┌──────────────────────────────────┐   │
│  │ Budget Trackers (Progress bars)  │   │
│  └──────────────────────────────────┘   │
│            ↓                             │
│  ┌──────────────────────────────────┐   │
│  │ DrillDownPanel (Sheet/Drawer)    │   │
│  │ - Desktop: Sheet (right side)    │   │
│  │ - Mobile: Drawer (bottom)        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Migration Path

**Phase 1: URL State (2-3 hours)**
1. Install nuqs
2. Replace existing month/year state with URL state
3. Test deep linking

**Phase 2: Date Range Filter (4-5 hours)**
1. Copy Date Range Picker component
2. Add custom presets (YTD, etc.)
3. Integrate with existing filter bar
4. Connect to React Query

**Phase 3: Drill-Down Panel (3-4 hours)**
1. Create DrillDownPanel wrapper component
2. Add onClick handlers to CategoryDonut
3. Fetch detailed expense data
4. Render in Sheet/Drawer

**Phase 4: Budget Tracking (5-6 hours)**
1. Design/create Supabase budget schema
2. Build BudgetTracker component
3. Add budget CRUD UI
4. Display progress bars in analytics

**Total estimated effort:** 14-18 hours

---

## Sources

### URL State Management
- [nuqs Official Documentation](https://nuqs.dev/)
- [nuqs GitHub Repository](https://github.com/47ng/nuqs)
- [React Advanced 2025: Type Safe URL State Management](https://www.infoq.com/news/2025/12/nuqs-react-advanced/)
- [LogRocket: Advanced React State Management Using URL Parameters](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)

### Date Range Components
- [shadcn/ui Date Picker Documentation](https://ui.shadcn.com/docs/components/date-picker)
- [Date Range Picker for shadcn GitHub](https://github.com/johnpolacek/date-range-picker-for-shadcn)
- [React DayPicker Official Documentation](https://daypicker.dev/)
- [shadcn/ui Calendar Documentation](https://ui.shadcn.com/docs/components/calendar)

### Responsive Drawer/Sheet Pattern
- [shadcn/ui Drawer Documentation](https://ui.shadcn.com/docs/components/drawer)
- [Radix UI Dialog Primitives](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Building a Drawer Component by Emil Kowalski](https://emilkowal.ski/ui/building-a-drawer-component)
- [Material UI: React useMediaQuery](https://mui.com/material-ui/react-use-media-query/)
- [usehooks-ts useMediaQuery](https://usehooks-ts.com/react-hook/use-media-query)

### Recharts & Analytics
- [Recharts: How to Use it and Build Analytics Dashboards](https://embeddable.com/blog/what-is-recharts)
- [PostHog: How to Use Recharts to Visualize Analytics Data](https://posthog.com/tutorials/recharts)
- [JavaScript Chart Libraries in 2026](https://www.luzmo.com/blog/javascript-chart-libraries)
- [Syncfusion: React Drill-Down Charts](https://www.syncfusion.com/blogs/post/workforce-data-react-drill-down-chart)

### Budget Tracking & Progress Components
- [shadcn/ui Progress Documentation](https://ui.shadcn.com/docs/components/progress)
- [Tremor – Tailwind CSS UI Components for Charts and Dashboards](https://www.tremor.so/)

---

## Final Recommendation

**ADD:**
1. ✅ nuqs (6 kB) - Type-safe URL state
2. ✅ @radix-ui/react-icons (2 kB) - Icons for date picker
3. ✅ Date Range Picker component (copy-paste) - Production-ready presets

**USE EXISTING:**
1. ✅ react-day-picker - Range selection
2. ✅ date-fns - Date calculations
3. ✅ Sheet + Drawer - Responsive panels
4. ✅ useIsMobile - Breakpoint detection
5. ✅ Progress - Budget bars
6. ✅ Recharts - Charts with drill-down
7. ✅ React Query - Data fetching

**DON'T ADD:**
- ❌ New UI libraries (Tremor, Mantine, MUI)
- ❌ State management libraries (Redux, Zustand)
- ❌ Alternative date libraries (Moment.js)
- ❌ Chart alternatives (Chart.js, Victory)

**Bundle size impact:** +8 kB gzipped
**Development time saved:** ~10 hours (by reusing existing components)
**Maintainability:** High (minimal dependencies, shadcn philosophy)

---

**This stack is production-ready for a 2026 analytics dashboard.**
