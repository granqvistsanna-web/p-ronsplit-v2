# Phase 1: Filter Foundation - Research

**Researched:** 2026-01-27
**Domain:** URL-based filter state management with React Router v6
**Confidence:** HIGH

## Summary

This phase establishes the foundation for all analytics filtering by implementing URL-based state management for date range presets and household member selection. The research confirms that React Router v6's `useSearchParams` hook is the standard approach for shareable, persistent filter state. The existing `MonthSelectionProvider` context should be gradually migrated to URL params to enable deep linking and browser history support.

The standard stack combines React Router's `useSearchParams` for URL state management, date-fns (already in use) for date range calculations, and shadcn/ui components (Popover + Command for multi-select) for the filter UI. Key architectural decisions include: URL as single source of truth for filter state, date presets calculated using date-fns functions like `subDays()` and `startOfYear()`, and a reset button that conditionally appears when filters deviate from defaults.

**Primary recommendation:** Implement URL search params using `useSearchParams` with callback pattern to preserve existing parameters, build date presets with date-fns functions, use shadcn Command + Popover for multi-select member filtering, and show conditional reset link using derived state comparison.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Router DOM | 6.30.1 | URL state management via useSearchParams | Official React Router v6 hook for query parameters; widely adopted, stable API |
| date-fns | 3.6.0 | Date range calculations | Already in project; provides 200+ date utility functions; pure functions, immutable; TypeScript support |
| shadcn/ui Command | Latest | Multi-select dropdown with search | Built on cmdk; accessible (Radix UI); already in project |
| shadcn/ui Popover | Latest | Container for filter dropdowns | Radix UI primitive; keyboard navigation; already in project |
| shadcn/ui Select | Latest | Single-select for date presets | Already used in Analys.tsx; consistent UI patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| URLSearchParams | Native | Browser API for query param parsing | Returned by useSearchParams; standard web API |
| Radix UI Checkbox | 2.2.x | Member selection checkboxes | Multi-select UI within Popover; accessible; already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useSearchParams | nuqs library | nuqs provides type-safe params with automatic parsing but adds dependency; overkill for simple string/array params |
| date-fns | Day.js | Day.js is smaller but date-fns already in use; no benefit to switching |
| Custom multi-select | react-select | react-select is feature-rich but heavyweight; shadcn patterns more consistent with existing UI |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
# React Router DOM 6.30.1, date-fns 3.6.0, shadcn/ui components already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── filters/          # Filter-specific components
│   │   ├── FilterBar.tsx          # Main filter container component
│   │   ├── DateRangeFilter.tsx    # Date preset selector
│   │   └── MemberFilter.tsx       # Multi-select member dropdown
│   └── ui/               # Existing shadcn components
└── hooks/
    └── useFilterParams.tsx   # Custom hook for URL filter state
```

### Pattern 1: URL Search Params as Single Source of Truth
**What:** Store filter state in URL query parameters instead of React context or useState
**When to use:** Filters that need to be shareable, persistent across refreshes, and support browser back/forward navigation
**Example:**
```typescript
// Source: React Router official docs + LogRocket best practices
import { useSearchParams } from "react-router-dom";

function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL (URL is source of truth)
  const dateRange = searchParams.get('range') || 'this-month';
  const members = searchParams.get('members')?.split(',').filter(Boolean) || [];

  // Update filters - use callback to preserve other params
  const setDateRange = (range: string) => {
    setSearchParams((prev) => {
      prev.set('range', range);
      return prev;
    });
  };

  const setMembers = (memberIds: string[]) => {
    setSearchParams((prev) => {
      if (memberIds.length === 0) {
        prev.delete('members'); // Remove param if empty
      } else {
        prev.set('members', memberIds.join(','));
      }
      return prev;
    });
  };

  return { dateRange, members, setDateRange, setMembers };
}
```

### Pattern 2: Date Range Preset Calculations with date-fns
**What:** Calculate start/end dates for common presets using date-fns functions
**When to use:** Date range filters with presets like "Last 30 days", "YTD", "Last 3 months"
**Example:**
```typescript
// Source: date-fns documentation + community patterns
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

const DATE_PRESETS = {
  'this-month': () => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }),
  'last-month': () => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth)
    };
  },
  'last-30-days': () => ({
    start: subDays(new Date(), 30),
    end: new Date()
  }),
  'ytd': () => ({
    start: startOfYear(new Date()),
    end: new Date()
  }),
  'last-3-months': () => ({
    start: subMonths(new Date(), 3),
    end: new Date()
  }),
  'last-6-months': () => ({
    start: subMonths(new Date(), 6),
    end: new Date()
  }),
  'last-12-months': () => ({
    start: subMonths(new Date(), 12),
    end: new Date()
  })
} as const;

function getDateRange(preset: string) {
  const calculator = DATE_PRESETS[preset];
  return calculator ? calculator() : DATE_PRESETS['this-month']();
}
```

### Pattern 3: Multi-Select with Command + Popover
**What:** Member filter using shadcn Command (search + keyboard nav) inside Popover
**When to use:** Multi-select dropdowns with search functionality
**Example:**
```typescript
// Source: shadcn/ui patterns + community implementations
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

function MemberFilter({ members, selectedIds, onSelectionChange }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {selectedIds.length === 0 ? 'All members' : `${selectedIds.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            {members.map((member) => (
              <CommandItem
                key={member.id}
                onSelect={() => {
                  const newSelection = selectedIds.includes(member.id)
                    ? selectedIds.filter(id => id !== member.id)
                    : [...selectedIds, member.id];
                  onSelectionChange(newSelection);
                }}
              >
                <Checkbox checked={selectedIds.includes(member.id)} />
                <span>{member.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 4: Conditional Reset Button (Derived State)
**What:** Show reset button only when current filters differ from defaults
**When to use:** Filter UIs where reset action is contextual, not always needed
**Example:**
```typescript
// Source: Filter UX best practices from Pencil & Paper
function FilterBar() {
  const { dateRange, members, setDateRange, setMembers } = useFilterParams();

  // Derive whether filters are at default state
  const DEFAULT_RANGE = 'this-month';
  const DEFAULT_MEMBERS = [];
  const hasActiveFilters = dateRange !== DEFAULT_RANGE || members.length > 0;

  const resetFilters = () => {
    setSearchParams({}); // Clear all params, returns to defaults
  };

  return (
    <div>
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <MemberFilter selected={members} onChange={setMembers} />
      {hasActiveFilters && (
        <Button variant="ghost" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Duplicating state in useState and URL:** Don't mirror URL params in local state; URL is single source of truth. Leads to sync issues.
- **Setting searchParams without callback:** Using `setSearchParams({ range: 'new' })` overwrites all other params. Always use callback form: `setSearchParams(prev => { prev.set('range', 'new'); return prev; })`
- **Ignoring URLSearchParams string nature:** All URL params are strings. Convert to proper types: `Number(searchParams.get('page') || 1)`, `searchParams.get('members')?.split(',') || []`
- **Custom date range pickers in v1:** Adds UI/validation complexity. Presets cover 90% of use cases; defer custom ranges to v2.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query param parsing/serialization | Custom string parsing for arrays/objects | URLSearchParams + split/join for arrays | Native browser API handles encoding; string split/join sufficient for simple arrays |
| Date range calculations | Manual date math with Date constructor | date-fns functions (subDays, startOfMonth, etc.) | Edge cases: month boundaries, leap years, DST; date-fns is battle-tested |
| Multi-select dropdown | Custom dropdown with state management | shadcn Command + Popover + Checkbox | Accessibility (ARIA, keyboard nav), search, focus management already handled |
| Browser history sync | Manual history.pushState/replaceState | React Router's setSearchParams | Automatic history integration, navigation events, stable references for useEffect |

**Key insight:** URL state management has subtle edge cases (encoding, history stack, concurrent updates). React Router's `useSearchParams` abstracts these correctly; manual implementation leads to bugs with back/forward buttons and special characters.

## Common Pitfalls

### Pitfall 1: setSearchParams Overwrites All Parameters
**What goes wrong:** Calling `setSearchParams({ range: 'ytd' })` deletes all other query params (e.g., `?members=1,2` gets removed)
**Why it happens:** Object syntax replaces entire URLSearchParams, not merging like React's setState
**How to avoid:** Always use callback pattern: `setSearchParams(prev => { prev.set('key', 'value'); return prev; })`
**Warning signs:** Other filters reset unexpectedly when changing one filter; URL params disappear

### Pitfall 2: Missing Suspense Boundary (Next.js specific, not applicable here)
**What goes wrong:** N/A - this project uses Vite + React Router, not Next.js App Router
**Note:** Documented for completeness; not a concern for this project

### Pitfall 3: Filter State Doesn't Persist on Refresh
**What goes wrong:** Users reload page and lose their filter selections
**Why it happens:** Using useState or Context for filters instead of URL params
**How to avoid:** Read filter state from `searchParams` on mount; derive component state from URL
**Warning signs:** User complaints about lost filters; filters reset after refresh

### Pitfall 4: Back Button Doesn't Update Filters
**What goes wrong:** Browser back/forward buttons don't trigger filter updates
**Why it happens:** Not re-rendering when URL changes; using `window.history` instead of React Router
**How to avoid:** React Router's `useSearchParams` automatically triggers re-renders on URL changes; no manual popstate listeners needed
**Warning signs:** Back button changes URL but UI doesn't update; console shows URL changed but state is stale

### Pitfall 5: Existing MonthSelection Context Conflicts with URL State
**What goes wrong:** Two sources of truth - Context and URL - get out of sync
**Why it happens:** Current Analys.tsx uses local useState for month/year; adding URL params creates dual state
**How to avoid:** Gradual migration: read from URL first, fall back to Context if URL param missing; eventually remove Context
**Warning signs:** Month changes but URL doesn't update; shareable link doesn't show correct month

### Pitfall 6: Date Preset Keys Not URL-Safe
**What goes wrong:** Using spaces or special chars in preset keys breaks URL sharing: `?range=Last 30 Days` → encoding issues
**Why it happens:** Natural language strings used as enum values
**How to avoid:** Use kebab-case keys: 'last-30-days', 'this-month', 'ytd'
**Warning signs:** URL encoding looks garbled; parsing errors when sharing links

### Pitfall 7: Empty Member Selection Bloats URL
**What goes wrong:** Default "all members" state adds unnecessary `?members=` param to every URL
**Why it happens:** Always setting param even when empty
**How to avoid:** Delete param when value equals default: `if (members.length === 0) prev.delete('members'); else prev.set('members', ids.join(','))`
**Warning signs:** URLs always have `?members=` even on fresh page load; URL changes when user selects "all"

## Code Examples

Verified patterns from official sources:

### Reading Filter State from URL
```typescript
// Source: React Router v6 useSearchParams documentation
import { useSearchParams } from "react-router-dom";

function AnalyticsPage() {
  const [searchParams] = useSearchParams();

  // Read with defaults
  const dateRange = searchParams.get('range') || 'this-month';
  const memberIds = searchParams.get('members')?.split(',').filter(Boolean) || [];

  // Compute actual date range
  const { start, end } = getDateRange(dateRange);

  // Use in data filtering
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const matchesDate = expenseDate >= start && expenseDate <= end;
    const matchesMember = memberIds.length === 0 || memberIds.includes(expense.paid_by);
    return matchesDate && matchesMember;
  });

  return <div>{/* Render filtered data */}</div>;
}
```

### Updating Filter State (Preserving Other Params)
```typescript
// Source: React Router documentation + community best practices
function DateRangeFilter({ value, onChange }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleChange = (newRange: string) => {
    setSearchParams((prev) => {
      prev.set('range', newRange);
      return prev;
    });
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="this-month">This month</SelectItem>
        <SelectItem value="last-month">Last month</SelectItem>
        <SelectItem value="last-30-days">Last 30 days</SelectItem>
        <SelectItem value="ytd">Year to date</SelectItem>
        <SelectItem value="last-3-months">Last 3 months</SelectItem>
        <SelectItem value="last-6-months">Last 6 months</SelectItem>
        <SelectItem value="last-12-months">Last 12 months</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Custom Hook for Filter State Management
```typescript
// Source: Community pattern from Medium + LogRocket
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";

export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current values
  const dateRange = searchParams.get('range') || 'this-month';
  const memberIds = searchParams.get('members')?.split(',').filter(Boolean) || [];

  // Compute date boundaries
  const dateFilter = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    return { start, end, preset: dateRange };
  }, [dateRange]);

  // Update functions that preserve other params
  const setDateRange = (range: string) => {
    setSearchParams(prev => {
      prev.set('range', range);
      return prev;
    });
  };

  const setMembers = (ids: string[]) => {
    setSearchParams(prev => {
      if (ids.length === 0) {
        prev.delete('members');
      } else {
        prev.set('members', ids.join(','));
      }
      return prev;
    });
  };

  const resetFilters = () => {
    setSearchParams({}); // Clear all params
  };

  // Check if filters are active (differ from defaults)
  const hasActiveFilters = dateRange !== 'this-month' || memberIds.length > 0;

  return {
    dateFilter,
    members: memberIds,
    setDateRange,
    setMembers,
    resetFilters,
    hasActiveFilters
  };
}
```

### Date Range Calculation Utility
```typescript
// Source: date-fns documentation + GitHub discussions
import {
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfDay,
  startOfDay
} from 'date-fns';

type DatePreset = 'this-month' | 'last-month' | 'last-30-days' | 'ytd' |
                  'last-3-months' | 'last-6-months' | 'last-12-months';

const PRESET_CALCULATORS: Record<DatePreset, () => { start: Date; end: Date }> = {
  'this-month': () => ({
    start: startOfDay(startOfMonth(new Date())),
    end: endOfDay(endOfMonth(new Date()))
  }),
  'last-month': () => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      start: startOfDay(startOfMonth(lastMonth)),
      end: endOfDay(endOfMonth(lastMonth))
    };
  },
  'last-30-days': () => ({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date())
  }),
  'ytd': () => ({
    start: startOfDay(startOfYear(new Date())),
    end: endOfDay(new Date())
  }),
  'last-3-months': () => ({
    start: startOfDay(subMonths(new Date(), 3)),
    end: endOfDay(new Date())
  }),
  'last-6-months': () => ({
    start: startOfDay(subMonths(new Date(), 6)),
    end: endOfDay(new Date())
  }),
  'last-12-months': () => ({
    start: startOfDay(subMonths(new Date(), 12)),
    end: endOfDay(new Date())
  })
};

export function getDateRange(preset: string): { start: Date; end: Date } {
  const calculator = PRESET_CALCULATORS[preset as DatePreset];
  if (!calculator) {
    console.warn(`Unknown date preset: ${preset}, falling back to this-month`);
    return PRESET_CALCULATORS['this-month']();
  }
  return calculator();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local useState for filters | URL search params | React Router v6 (2021) | Filters now shareable, persistent, and support browser history |
| Manual history.pushState | React Router useSearchParams | React Router v6 (2021) | Automatic history sync, no manual event listeners needed |
| date-fns v2 | date-fns v3 | 2023 | Native TypeScript types, tree-shaking improvements; API unchanged for our use case |
| Custom multi-select components | Command + Popover pattern | shadcn/ui adoption (2023+) | Accessibility built-in, consistent design system |

**Deprecated/outdated:**
- `useHistory` hook: Replaced by `useNavigate` in React Router v6; not needed for query params
- `history.location.search` manual parsing: Use `useSearchParams` instead; handles encoding/decoding
- React Router v5 `<Prompt>` component: No stable v6 equivalent yet; not needed for this phase

## Open Questions

Things that couldn't be fully resolved:

1. **Transition Strategy from MonthSelection Context to URL State**
   - What we know: Current Analys.tsx uses local useState; MonthSelectionProvider exists but should be phased out for analytics filtering
   - What's unclear: Whether to remove MonthSelectionProvider entirely or keep it for other pages (Index, Aktivitet)
   - Recommendation: Phase 1 adds URL params for Analys page only; Phase 2 evaluates migrating other pages; keep Context for now if other pages need it

2. **Default Filter Behavior for New Users**
   - What we know: "This month" + "All members" are sensible defaults
   - What's unclear: Whether to pre-populate URL with `?range=this-month` or treat empty URL as default
   - Recommendation: Empty URL = defaults (cleaner URLs); only add params when user changes filters

3. **URL Length Concerns with Many Members**
   - What we know: `?members=uuid1,uuid2,uuid3...` could get long with many household members
   - What's unclear: Household size in typical usage; whether URL length is practical concern
   - Recommendation: Proceed with comma-separated IDs; typical household has 2-4 members (well under URL limits); revisit if >10 members becomes common

4. **Filter Persistence Across Page Navigation**
   - What we know: URL params persist when navigating between Analys and other pages
   - What's unclear: Should filters persist when user navigates to Index, then back to Analys?
   - Recommendation: Yes - URL is source of truth; filters persist naturally with browser back button

## Sources

### Primary (HIGH confidence)
- React Router v6 useSearchParams API: https://api.reactrouter.com/v7/functions/react_router.useSearchParams.html
- date-fns documentation: https://date-fns.org/ (v3.6.0 confirmed in project)
- shadcn/ui Combobox: https://ui.shadcn.com/docs/components/combobox
- shadcn/ui Select: https://ui.shadcn.com/docs/components/select
- Radix UI Checkbox Group: https://www.radix-ui.com/themes/docs/components/checkbox-group

### Secondary (MEDIUM confidence)
- LogRocket: Why URL state matters - https://blog.logrocket.com/url-state-usesearchparams/
- LogRocket: Advanced React state management using URL parameters - https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/
- React Router search params best practices - https://cgarethc.medium.com/using-react-router-searchparams-to-manage-filter-state-for-a-list-e515e8e50166
- date-fns functions documentation - https://www.npmjs.com/package/date-fns
- date-fns GitHub discussions on date ranges - https://github.com/orgs/date-fns/discussions/2933
- Filter UX best practices - https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering
- shadcn multi-select implementations - https://github.com/sersavan/shadcn-multi-select-component

### Tertiary (LOW confidence)
- shadcn-ui-expansions multiple selector: https://shadcnui-expansions.typeart.cc/docs/multiple-selector (community extension, not official)
- nuqs library: https://nuqs.dev/ (alternative approach; good for reference but not using)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project; React Router v6 and date-fns are industry standard for this use case
- Architecture: HIGH - useSearchParams patterns well-documented in React Router official docs; community consensus on URL-as-state approach
- Pitfalls: HIGH - Common issues documented across multiple sources (LogRocket, Medium, Stack Overflow); callback pattern clearly stated in React Router docs

**Research date:** 2026-01-27
**Valid until:** 60 days (React Router v6 stable; date-fns v3 mature; shadcn/ui patterns unlikely to change)

**Key dependencies verified:**
- React Router DOM: 6.30.1 (from package.json via STACK.md)
- date-fns: 3.6.0 (from package.json via STACK.md)
- Radix UI components: All required primitives installed (from STACK.md)

**Integration points:**
- Existing: Analys.tsx uses local state for month selection; needs migration to URL params
- Existing: useMonthSelection context used across pages; analytics should use URL state instead
- Existing: shadcn/ui Select already used in Analys.tsx for month picker; can reuse for date preset selector
- New: FilterBar component to be created in /src/components/filters/
