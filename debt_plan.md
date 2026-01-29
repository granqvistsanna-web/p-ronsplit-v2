# Technical Debt Payoff Plan: Päronsplit

**Created:** 2026-01-29
**Priority:** Prevent rot, reduce onboarding friction, improve maintainability

---

## Executive Summary

This codebase is **moderately healthy** (entropy score 5.6/10) but has three critical areas requiring intervention:

1. **Currency unit mismatch** (kr vs öre) - High bug potential
2. **ImportModal monolith** (875 LOC) - Unmaintainable
3. **Low test coverage** (2 test files) - Regression risk

The payoff sequence below is ordered by **risk-reduction per effort** ratio.

---

## Debt Payoff Sequence

### Wave 1: Type Safety (Prevent Rot)

**Goal:** Eliminate the #1 bug source - currency unit confusion

#### 1.1 Introduce Branded Types for Currency

```typescript
// src/lib/currency.ts
type Kronor = number & { readonly __brand: 'kronor' };
type Ore = number & { readonly __brand: 'ore' };

export function kronor(value: number): Kronor {
  return value as Kronor;
}

export function ore(value: number): Ore {
  return value as Ore;
}

export function toKronor(ore: Ore): Kronor {
  return (ore / 100) as Kronor;
}

export function toOre(kronor: Kronor): Ore {
  return (kronor * 100) as Ore;
}
```

**Files to update:**
- `src/lib/types.ts` - Update `Income.amount` to type `Ore`
- `src/lib/balanceUtils.ts` - Use branded types
- All components handling amounts

**Effort:** Medium
**Impact:** Eliminates entire class of 100x bugs at compile time

#### 1.2 Replace `: any` with Proper Types

Create Recharts type declarations:

```typescript
// src/types/recharts.d.ts
export interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

export interface LegendProps {
  payload?: Array<{
    value: string;
    type: string;
    id: string;
    color: string;
  }>;
}
```

**Files to update:**
- `src/components/analytics/CategoryDonut.tsx`
- `src/components/analytics/CategoryBarChart.tsx`
- `src/components/analytics/TrendChart.tsx`
- `src/components/analytics/ComparisonBar.tsx`

**Effort:** Low
**Impact:** Restores type safety in chart callbacks

---

### Wave 2: Test Infrastructure

**Goal:** Protect critical paths from regression

#### 2.1 Add Tests for Financial Calculations

Existing tests in `balanceUtils.test.ts` are good. Extend coverage:

```typescript
// src/lib/currency.test.ts
describe('currency conversions', () => {
  it('handles edge cases: 0, negative, very large');
  it('maintains precision with Math.round');
  it('rejects invalid inputs');
});

// src/lib/budgetUtils.test.ts
describe('budget calculations', () => {
  it('calculates pacing correctly');
  it('handles empty expense lists');
  it('suggests budgets from history');
});
```

**Priority tests:**
1. `currency.ts` - All conversion functions
2. `budgetUtils.ts` - `calculateBudgetStatus`, `calculateBudgetPacing`
3. `categoryMatcher.ts` - Already has good tests, add edge cases

**Effort:** Medium
**Impact:** High - protects financial accuracy

#### 2.2 Add Integration Test for Balance Flow

```typescript
// src/lib/balanceUtils.integration.test.ts
describe('full balance calculation flow', () => {
  it('correctly calculates balance with mixed kr/öre inputs');
  it('handles settlement adjustments');
  it('produces zero-sum balances across members');
});
```

---

### Wave 3: Component Decomposition

**Goal:** Make ImportModal maintainable

#### 3.1 Extract Import Workflow Steps

Break `ImportModal.tsx` (875 LOC) into:

```
src/components/import/
├── ImportModal.tsx          (~100 LOC) - Orchestrator
├── FileUploadStep.tsx       (~150 LOC) - Drag-drop, validation
├── CategoryReviewStep.tsx   (~200 LOC) - Category assignment
├── TransactionPreviewStep.tsx (~150 LOC) - Final review
└── useImportWorkflow.tsx    (~150 LOC) - State machine
```

**Key extraction:**
```typescript
// src/components/import/useImportWorkflow.tsx
type ImportStep = 'upload' | 'categorize' | 'review';

export function useImportWorkflow() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [categorizations, setCategorizations] = useState<Map<string, string>>();

  // ... state transitions
}
```

**Effort:** High
**Impact:** Critical - currently blocking factor for maintainability

#### 3.2 Consolidate Modal Pattern

Create reusable modal form component:

```typescript
// src/components/ui/FormModal.tsx
interface FormModalProps<T> {
  title: string;
  schema: ZodSchema<T>;
  defaultValues: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  fields: FormFieldConfig[];
}
```

Apply to: AddExpenseModal, AddIncomeModal, EditExpenseModal, etc.

**Effort:** High
**Impact:** Medium - reduces duplication, ensures consistency

---

### Wave 4: Error Handling Consolidation

**Goal:** Consistent error handling, better debugging

#### 4.1 Apply errorHandling.ts Universally

Replace direct `toast.error()` calls with:

```typescript
import { handleError, ErrorCategory } from '@/lib/errorHandling';

// Before
catch (error) {
  toast.error('Failed to save');
}

// After
catch (error) {
  handleError(error, ErrorCategory.DATABASE, {
    context: 'Creating expense',
    showToast: true
  });
}
```

**Files requiring update:** 27 files with toast calls

**Effort:** Medium
**Impact:** Medium - enables future Sentry integration, better debugging

#### 4.2 Add Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<ChartErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}
```

Wrap: All chart components, modal contents

---

### Wave 5: Performance & Architecture

**Goal:** Prevent future scaling issues

#### 5.1 Optimize Category Matcher

Replace linear search with trie or compiled regex:

```typescript
// src/lib/categoryMatcher.ts
const COMPILED_PATTERNS = new Map<RegExp, CategoryId>();

// Initialize once at module load
CATEGORY_RULES.forEach(({ pattern, category }) => {
  COMPILED_PATTERNS.set(new RegExp(pattern, 'i'), category);
});
```

Consider: Move patterns to config file or database for runtime updates.

**Effort:** Low
**Impact:** Prevents O(n) degradation as patterns grow

#### 5.2 Lazy Load Heavy Dependencies

```typescript
// Lazy load ExcelJS only when needed
const ExcelJS = await import('exceljs');
```

Apply to: `fileParser.ts`, chart components on Analys page

**Effort:** Low
**Impact:** Improves initial page load

#### 5.3 Document Query Key Patterns

Add comprehensive documentation:

```typescript
// src/hooks/queries/queryKeys.ts
/**
 * Query Key Factory Pattern (TkDodo pattern)
 *
 * Hierarchy:
 * ['expenses'] - all expense queries
 * ['expenses', 'list', filters] - filtered list
 * ['expenses', 'detail', id] - single expense
 *
 * Invalidation:
 * queryClient.invalidateQueries({ queryKey: ['expenses'] }) - invalidates all
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */
```

---

## Guardrails

### ESLint Rules to Add

```javascript
// eslint.config.js additions
{
  rules: {
    // Re-enable unused vars detection
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_"
    }],

    // Enforce explicit any replacement
    "@typescript-eslint/no-explicit-any": "warn",

    // Limit function length
    "max-lines-per-function": ["warn", {
      max: 200,
      skipBlankLines: true
    }],

    // Limit file length
    "max-lines": ["warn", {
      max: 400,
      skipBlankLines: true
    }],
  }
}
```

### Pre-commit Hooks

```json
// .husky/pre-commit
#!/bin/sh
npm run lint
npm run test:run
```

### Code Review Checklist

Add to PR template:

```markdown
## Code Review Checklist

- [ ] Currency amounts use correct units (kr for expenses, öre for incomes)
- [ ] toKronor/toOre conversions are applied at display/storage boundaries
- [ ] Error handling uses handleError() from errorHandling.ts
- [ ] New components under 400 LOC
- [ ] New tests added for business logic
- [ ] No new `: any` types without justification
```

### Conventions Document

Create `CONVENTIONS.md`:

```markdown
# Päronsplit Code Conventions

## Currency Handling
- Expenses: stored in kronor (kr)
- Incomes: stored in öre (cents)
- ALWAYS convert at boundaries:
  - User input → toOre() → database (for incomes)
  - Database → toKronor() → display (for incomes)

## Component Size Limits
- Single component: max 400 LOC
- If larger: extract into sub-components

## Error Handling
- Use handleError() from @/lib/errorHandling
- Never use bare toast.error() for caught errors

## Testing Requirements
- All financial calculations MUST have tests
- Test files: *.test.ts adjacent to source
```

---

## Priority Matrix

| Task | Effort | Impact | Risk Reduction | Priority |
|------|--------|--------|----------------|----------|
| Branded currency types | M | High | Critical | **P0** |
| Test currency.ts | L | High | High | **P0** |
| Replace `: any` | L | Medium | Medium | **P1** |
| Test budgetUtils.ts | M | High | Medium | **P1** |
| ESLint rules | L | Medium | Medium | **P1** |
| Decompose ImportModal | H | High | High | **P2** |
| Error handling consolidation | M | Medium | Medium | **P2** |
| Lazy load dependencies | L | Low | Low | **P3** |
| Consolidate modal pattern | H | Medium | Low | **P3** |
| Query key documentation | L | Low | Low | **P3** |

---

## Success Metrics

After implementing this plan:

| Metric | Current | Target |
|--------|---------|--------|
| Test coverage (critical paths) | 20% | 80% |
| Files with `: any` | 14 | 0 |
| Max component LOC | 875 | 400 |
| Inconsistent error handling | 27 files | 0 |
| Currency-related bugs | ~1/month | 0 |
| New developer ramp-up | 2-3 weeks | 1 week |

---

## Appendix: File-by-File Action Items

### Immediate (P0)
- `src/lib/currency.ts` - Add branded types
- `src/lib/types.ts` - Update Income.amount type
- `src/lib/currency.test.ts` - Create comprehensive tests

### Short-term (P1)
- `src/hooks/useExpenses.tsx:286,376` - Replace `: any`
- `src/hooks/useIncomes.tsx:242,317` - Replace `: any`
- `src/components/analytics/*.tsx` - Create Recharts types
- `src/lib/budgetUtils.test.ts` - Create tests
- `eslint.config.js` - Add new rules

### Medium-term (P2)
- `src/components/ImportModal.tsx` - Decompose
- All toast.error calls - Use handleError()
- Add Error Boundary components

### Long-term (P3)
- Modal component consolidation
- Query key documentation
- Performance optimizations
