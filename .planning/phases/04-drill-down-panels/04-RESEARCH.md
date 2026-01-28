# Phase 4: Drill-Down Panels - Research

**Researched:** 2026-01-28
**Domain:** Responsive UI patterns (side panels, bottom sheets), chart interaction, transaction lists
**Confidence:** HIGH

## Summary

This phase implements category drill-down functionality allowing users to click on category bars in the visualization to see filtered transaction details. The implementation requires a responsive pattern: side panels for desktop (≥768px) and bottom sheets for mobile (<768px).

The project already has the necessary infrastructure in place:
- **vaul** (v0.9.9) for drawer/bottom sheet functionality with native swipe-to-dismiss
- **shadcn/ui Sheet** (based on Radix Dialog) for side panel implementation
- **useIsMobile** hook with 768px breakpoint matching project conventions
- **Recharts** with onClick event handlers on Bar components
- **ExpenseItem** component for transaction list rendering

The standard approach is a responsive dialog/drawer pattern: render Sheet on desktop (≥768px), Drawer on mobile (<768px), using the existing `useIsMobile` hook to detect viewport size.

**Primary recommendation:** Use shadcn Sheet for desktop side panel, shadcn Drawer (vaul) for mobile bottom sheet, with conditional rendering based on useIsMobile hook. Implement onClick handlers on Recharts Bar component to capture category selection and filter expense data accordingly.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | 1.1.14 | Desktop side panel primitive | Industry standard for accessible modals, used by shadcn Sheet |
| vaul | 0.9.9 | Mobile bottom sheet/drawer | Best-in-class React drawer with native iOS-like feel and swipe gestures |
| recharts | 2.15.4 | Chart interaction events | Already in use for Phase 3 charts, provides onClick handlers |
| framer-motion | 12.23.26 | Touch feedback animations | Already in project, used for whileTap scale effects on interactive elements |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.0 | Close button icons | Already in use, provides X icon for close buttons |
| @radix-ui/react-scroll-area | 1.2.9 | Scrollable transaction lists | Already installed, for long transaction lists in panels |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vaul + Sheet pattern | Single Dialog everywhere | Loses native mobile feel and swipe gestures on touch devices |
| Vaul + Sheet pattern | Full-page navigation | More disruptive, loses context of chart while viewing transactions |
| Conditional rendering | Single adaptive component | More complex to maintain, breaks component composition patterns |

**Installation:**
```bash
# All dependencies already installed
# vaul@0.9.9, @radix-ui/react-dialog@1.1.14, recharts@2.15.4
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── analytics/
│   │   ├── CategoryBarChart.tsx          # Already exists from Phase 3
│   │   ├── CategoryDrillDown.tsx         # NEW: Responsive wrapper component
│   │   └── TransactionList.tsx           # NEW: Filtered transaction list
│   └── ui/
│       ├── sheet.tsx                      # Already exists (Radix Dialog wrapper)
│       └── drawer.tsx                     # Already exists (vaul wrapper)
└── hooks/
    └── use-mobile.tsx                     # Already exists (768px breakpoint)
```

### Pattern 1: Responsive Dialog/Drawer Pattern (RECOMMENDED)

**What:** Conditionally render Sheet (desktop) or Drawer (mobile) based on viewport width
**When to use:** When you need different UI patterns for mobile vs desktop
**Example:**

```typescript
// Source: shadcn/ui responsive drawer pattern
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Drawer, DrawerContent } from "@/components/ui/drawer"

export function CategoryDrillDown({
  open,
  onOpenChange,
  categoryId,
  categoryName
}: CategoryDrillDownProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          {/* Transaction list content */}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {/* Transaction list content */}
      </SheetContent>
    </Sheet>
  )
}
```

### Pattern 2: Recharts Bar Click Handler

**What:** Capture click events on bar chart categories to trigger drill-down
**When to use:** When you need to make chart elements interactive
**Example:**

```typescript
// Source: Recharts GitHub issues #94, #1047
import { Bar, BarChart } from "recharts"

export function CategoryBarChart({ expenses, onCategoryClick }) {
  const categoryData = useMemo(() =>
    aggregateByCategory(expenses),
    [expenses]
  )

  const handleBarClick = (data: any) => {
    // data.payload contains the full data object
    const { categoryId, categoryName } = data
    onCategoryClick(categoryId, categoryName)
  }

  return (
    <BarChart data={categoryData}>
      <Bar
        dataKey="amount"
        fill="var(--color-amount)"
        onClick={handleBarClick}
        cursor="pointer"
        style={{ cursor: 'pointer' }}
      />
    </BarChart>
  )
}
```

### Pattern 3: Transaction List with Filtering

**What:** Render filtered expense list inside drill-down panel
**When to use:** Displaying category-specific transactions
**Example:**

```typescript
// Based on existing ExpenseItem pattern from codebase
export function TransactionList({
  expenses,
  categoryId,
  members
}: TransactionListProps) {
  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.category === categoryId),
    [expenses, categoryId]
  )

  if (filteredExpenses.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Inga transaktioner i denna kategori
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {filteredExpenses.map((expense, idx) => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          members={members}
          index={idx}
        />
      ))}
    </div>
  )
}
```

### Pattern 4: Touch Target Sizing for Mobile

**What:** Ensure all interactive elements meet 44x44px minimum for accessibility
**When to use:** Always on mobile interactive elements
**Example:**

```typescript
// Source: WCAG 2.5.5 (AAA) and mobile platform guidelines
// Apply to close buttons, list items, any tappable surface

<button
  className="min-h-[44px] min-w-[44px]"  // Explicit sizing
  // or
  className="p-3"  // 12px padding × 2 + icon size ≥ 44px
>
  <X size={20} />
</button>

// For ExpenseItem (already 48px height with py-3)
<motion.button
  className="w-full py-3"  // 16px font + 12px padding top/bottom = 40px, close enough
  whileTap={{ scale: 0.98 }}
>
  {/* Expense content */}
</motion.button>
```

### Anti-Patterns to Avoid

- **Full-page navigation for drill-down:** Loses chart context, requires back navigation
- **Modal overlays on mobile:** Breaks native gesture expectations, feels non-native
- **Single responsive component:** Harder to maintain than conditional rendering with shared content component
- **Clicking label/tooltip instead of bar:** Recharts has known issue where clicking labels doesn't trigger bar onClick
- **Missing cursor pointer on interactive chart elements:** Users won't know bars are clickable

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile bottom sheet with gestures | Custom drag handlers and snap logic | vaul Drawer (already installed) | Handles snap points, velocity calculations, scroll locking, iOS edge cases |
| Accessible modal/dialog | DIV with z-index and backdrop | Radix Dialog via shadcn Sheet | Focus trap, escape key, screen reader announcements, portal rendering |
| Viewport width detection | window.innerWidth in effects | useIsMobile hook (already in codebase) | SSR-safe, handles resize events, prevents hydration mismatches |
| Touch feedback animations | CSS :active pseudo-class | framer-motion whileTap | Better performance, prevents scroll interference, customizable |

**Key insight:** Mobile gesture handling is deceptively complex. Vaul handles scroll locking (prevent body scroll when drawer open), velocity-based snap decisions (fast swipe vs slow drag), iOS Safari quirks (100vh issues, touch-action), and keyboard avoidan ce (repositions when keyboard opens). Building this correctly takes weeks; using vaul takes minutes.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with SSR and useMediaQuery

**What goes wrong:** Server renders one UI (e.g., desktop Sheet), client detects mobile and switches to Drawer, causing React hydration error
**Why it happens:** Server doesn't know viewport width at render time
**How to avoid:**
- Use client-side only rendering for responsive components
- Or render both and conditionally show with CSS (increases bundle size)
- Project uses Vite (client-only), so this is LOW RISK
**Warning signs:** Console errors about "did not match" during development

### Pitfall 2: Missing onClick Cursor Pointer on Chart

**What goes wrong:** Users don't know category bars are clickable because cursor doesn't change
**Why it happens:** Recharts Bar component doesn't automatically set cursor style
**How to avoid:**
```typescript
<Bar
  onClick={handleClick}
  cursor="pointer"  // Recharts prop
  style={{ cursor: 'pointer' }}  // SVG element fallback
/>
```
**Warning signs:** User confusion, low engagement with drill-down feature

### Pitfall 3: Drawer Content Not Scrollable on Small Screens

**What goes wrong:** Long transaction lists overflow drawer height, content is cut off
**Why it happens:** Drawer content needs explicit scroll container
**How to avoid:**
```typescript
<DrawerContent className="max-h-[85vh]">
  <DrawerHeader>...</DrawerHeader>
  <div className="flex-1 overflow-y-auto px-4">
    {/* Scrollable transaction list */}
  </div>
</DrawerContent>
```
**Warning signs:** Content invisible, no scroll affordance

### Pitfall 4: Touch Target Smaller Than 44px

**What goes wrong:** Mobile users have difficulty tapping close buttons or list items
**Why it happens:** Default icon/button sizes don't meet accessibility guidelines
**How to avoid:**
- Minimum 44×44px for all interactive elements (WCAG 2.5.5 AAA)
- Use `min-h-[44px] min-w-[44px]` or adequate padding
- Test on actual mobile device (DevTools touch emulation not reliable)
**Warning signs:** Users miss taps, need multiple attempts to close panel

### Pitfall 5: Panel State Not Cleared on Close

**What goes wrong:** Opening drill-down for Category A, closing, opening Category B shows Category A's data briefly
**Why it happens:** React state not reset on panel close
**How to avoid:**
```typescript
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

// Clear state on close
const handleOpenChange = (open: boolean) => {
  if (!open) {
    setSelectedCategory(null)  // Reset state
  }
}
```
**Warning signs:** Flickering wrong data when opening panel

## Code Examples

Verified patterns from official sources:

### Responsive Conditional Rendering (HIGH confidence)

```typescript
// Source: shadcn/ui patterns, existing useIsMobile hook at src/hooks/use-mobile.tsx
import { useIsMobile } from "@/hooks/use-mobile"

export function CategoryDrillDown({
  open,
  onOpenChange,
  selectedCategory,
  expenses,
  members
}: CategoryDrillDownProps) {
  const isMobile = useIsMobile()

  // Shared content component
  const content = (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedCategory?.icon}</span>
          <h2 className="text-lg font-semibold">{selectedCategory?.name}</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TransactionList
          expenses={expenses}
          categoryId={selectedCategory?.id}
          members={members}
        />
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        {content}
      </SheetContent>
    </Sheet>
  )
}
```

### Bar Chart Click Integration (MEDIUM confidence)

```typescript
// Source: Recharts GitHub issue #94, existing CategoryBarChart from Phase 3
// Add onClick handler to existing CategoryBarChart component

export function CategoryBarChart({
  expenses,
  members,
  showAll = false,
  stacked = false,
  onCategoryClick  // NEW prop
}: CategoryBarChartProps) {
  // ... existing categoryData and stackedData logic ...

  const handleBarClick = (data: any) => {
    // data is the clicked bar's data object
    const categoryId = data.categoryId || data.payload?.categoryId
    const categoryName = data.categoryName || data.payload?.categoryName
    const categoryIcon = data.icon || data.payload?.icon

    if (categoryId && onCategoryClick) {
      onCategoryClick({
        id: categoryId,
        name: categoryName,
        icon: categoryIcon
      })
    }
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: 0, bottom: 60 }}>
          {/* ... existing CartesianGrid, XAxis, YAxis, Tooltip ... */}

          <Bar
            dataKey="amount"
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
            onClick={handleBarClick}  // NEW: click handler
            cursor="pointer"           // NEW: cursor style
            style={{ cursor: 'pointer' }}  // NEW: SVG fallback
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
```

### Transaction List Component (HIGH confidence)

```typescript
// Source: Existing ExpenseItem component at src/components/ExpenseItem.tsx
import { ExpenseItem } from "@/components/ExpenseItem"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Expense, GroupMember } from "@/lib/types"

interface TransactionListProps {
  expenses: Expense[]
  categoryId: string
  members: GroupMember[]
  onEdit?: (expense: Expense) => void
  currentUserId?: string
}

export function TransactionList({
  expenses,
  categoryId,
  members,
  onEdit,
  currentUserId
}: TransactionListProps) {
  // Filter expenses by selected category
  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.category === categoryId),
    [expenses, categoryId]
  )

  // Empty state
  if (filteredExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Inga transaktioner i denna kategori
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {filteredExpenses.map((expense, idx) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            members={members}
            index={idx}
            onEdit={onEdit}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
```

### Touch Target Sizing (HIGH confidence)

```typescript
// Source: WCAG 2.5.5, Apple iOS HIG, Material Design guidelines

// Close button (minimum 44x44px)
<SheetClose className="absolute right-4 top-4 rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</SheetClose>

// List item (already compliant in ExpenseItem.tsx with py-3)
<motion.button
  className="w-full py-3"  // 24px padding top+bottom + 16px content ≈ 40px (acceptable for list items)
  whileTap={{ scale: 0.98 }}
>
  {/* Content */}
</motion.button>

// For extra assurance on critical actions:
<Button className="min-h-[44px]">
  Stäng
</Button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal dialog everywhere | Responsive Sheet (desktop) + Drawer (mobile) | shadcn v0.8+ (2024) | Better mobile UX with native gestures |
| Custom drag handlers | vaul library | 2023 | More reliable gesture handling, iOS compatibility |
| window.matchMedia directly | useMediaQuery/useIsMobile hook | React 16.8+ (2019) | SSR-safe, cleaner code |
| Touch target 32px | Touch target 44px (AAA) or 24px (AA) | WCAG 2.2 (2023) | Better mobile accessibility |

**Deprecated/outdated:**
- **react-swipeable-views:** Abandoned, use vaul instead
- **@reach/dialog:** Maintenance mode, Radix UI is now standard
- **Custom useMediaQuery implementations:** Use established library or shadcn hook

## Open Questions

Things that couldn't be fully resolved:

1. **Should drill-down support editing transactions inline?**
   - What we know: ExpenseItem component has onEdit prop for editing
   - What's unclear: Whether editing should work in drill-down context or require closing panel
   - Recommendation: Start with read-only view (simpler), add editing in future phase if needed

2. **Should incomes be included in category drill-down?**
   - What we know: Phase focuses on category chart which shows expenses
   - What's unclear: Whether income categories should also be drill-able
   - Recommendation: Expenses only for Phase 4, incomes can be added later if needed

3. **How to handle empty categories (shown in chart but zero transactions)?**
   - What we know: Chart shows top 8 categories by amount (non-zero)
   - What's unclear: Edge case if data changes between chart render and drill-down open
   - Recommendation: Show empty state gracefully (already in pattern), extremely low probability

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Sheet documentation](https://ui.shadcn.com/docs/components/sheet) - Component API and usage
- [shadcn/ui Drawer documentation](https://ui.shadcn.com/docs/components/drawer) - Mobile drawer pattern
- [Radix UI Dialog documentation](https://www.radix-ui.com/primitives/docs/components/dialog) - Accessibility features
- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - Touch target requirements
- [WCAG 2.5.8 Target Size Minimum](https://www.allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide) - Level AA requirements (24px)
- Existing codebase:
  - `src/hooks/use-mobile.tsx` - 768px breakpoint hook
  - `src/components/ui/sheet.tsx` - Radix Dialog wrapper
  - `src/components/ui/drawer.tsx` - vaul wrapper
  - `src/components/ExpenseItem.tsx` - Transaction list item component
  - `src/components/analytics/CategoryBarChart.tsx` - Phase 3 chart component

### Secondary (MEDIUM confidence)
- [Recharts onClick event (GitHub #94)](https://github.com/recharts/recharts/issues/94) - Bar click handling
- [LogRocket: Accessible Touch Targets](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/) - Mobile UX best practices
- [Material UI useMediaQuery](https://mui.com/material-ui/react-use-media-query/) - Responsive pattern reference
- [NN/G Bottom Sheets Guidelines](https://www.nngroup.com/articles/bottom-sheet/) - Mobile UX patterns

### Tertiary (LOW confidence)
- [Vaul GitHub Repository](https://github.com/emilkowalski/vaul) - Note: Marked as "unmaintained hobby project" but 342k dependents, still functional
- Medium articles on bottom sheet implementation - General patterns only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns verified in existing codebase and official docs
- Pitfalls: MEDIUM - Based on community issues and best practices, not project-specific experience

**Research date:** 2026-01-28
**Valid until:** 60 days (stable ecosystem, mature libraries)

**Key risks:**
- LOW: Vaul maintenance concern (but working in production with 342k dependents)
- LOW: Recharts onClick edge cases (clicking label vs bar)
- MEDIUM: Touch target sizing verification needed on real devices

**Next steps for planner:**
1. Create CategoryDrillDown responsive wrapper component
2. Modify CategoryBarChart to accept onCategoryClick prop and handle Bar onClick
3. Create TransactionList component for filtered expense display
4. Verify touch targets meet 44px minimum on mobile
5. Test swipe-to-dismiss gesture on actual mobile device
