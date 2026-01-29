# Entropy Map: Päronsplit Technical Debt Audit

**Audit Date:** 2026-01-29
**Codebase:** Päronsplit (Household expense-splitting app)
**Total LOC:** ~25,800 lines TypeScript/React

---

## 1. Complexity Hotspots

### Critical Severity (Immediate Risk)

| File | LOC | Churn | Complexity Score | Issue |
|------|-----|-------|------------------|-------|
| `src/components/ImportModal.tsx` | 875 | 8 | **9/10** | Monolithic component with 3-step workflow, file parsing, AI integration, and 6+ state variables |
| `src/lib/balanceUtils.ts` | 215 | 5 | **8/10** | Core financial algorithm with mixed currency units (kr/öre) |
| `src/hooks/useGroups.tsx` | 578 | 12 | **7/10** | Complex invite code logic, collision detection, high mutation count |

### High Severity (Near-term Risk)

| File | LOC | Churn | Complexity Score | Issue |
|------|-----|-------|------------------|-------|
| `src/components/AddTransactionModal.tsx` | 710 | — | **7/10** | Dynamic split calculations, multiple distribution modes |
| `src/pages/Auth.tsx` | 546 | 8 | **6/10** | Rate limiting, multiple auth flows, password validation |
| `src/hooks/useExpenses.tsx` | 396 | 13 | **6/10** | JSON split parsing, error recovery, high churn |
| `src/hooks/useIncomes.tsx` | 337 | 14 | **6/10** | Similar pattern to useExpenses, currency conversion points |
| `src/pages/Index.tsx` | 385 | 17 | **6/10** | Highest churn file, 6+ modal states, multiple data sources |

### Medium Severity (Monitor)

| File | LOC | Churn | Complexity Score | Issue |
|------|-----|-------|------------------|-------|
| `src/lib/fileParser.ts` | 505 | — | **5/10** | Multi-format parsing, magic byte detection |
| `src/lib/budgetUtils.ts` | 371 | 5 | **5/10** | Budget calculations, 6-month history analysis |
| `src/lib/categoryMatcher.ts` | 214 | — | **5/10** | 67 hardcoded regex patterns, linear search O(n) |
| `src/pages/Analys.tsx` | 480 | 11 | **5/10** | 6+ useMemo calls, chart integrations |
| `src/components/BudgetSettingsModal.tsx` | 505 | — | **5/10** | Budget CRUD, suggested budget logic |

---

## 2. High-Churn Files (Last 2 Months)

Files with frequent changes indicate areas of instability or active development that accumulate debt:

```
23 changes  .planning/STATE.md          (documentation - acceptable)
18 changes  .planning/ROADMAP.md        (documentation - acceptable)
17 changes  src/pages/Index.tsx         ⚠️ HIGH RISK - main dashboard
14 changes  src/pages/Aktivitet.tsx     ⚠️ MEDIUM RISK
14 changes  src/hooks/useIncomes.tsx    ⚠️ MEDIUM RISK - currency handling
13 changes  src/hooks/useExpenses.tsx   ⚠️ MEDIUM RISK - core data hook
12 changes  src/hooks/useGroups.tsx     ⚠️ MEDIUM RISK - group management
12 changes  src/hooks/useAuth.tsx       ⚠️ MEDIUM RISK - authentication
11 changes  src/pages/Analys.tsx        ⚠️ MEDIUM RISK - analytics
9  changes  src/pages/Settings.tsx      LOW RISK
8  changes  src/components/ImportModal  ⚠️ HIGH RISK - already complex
```

**Pattern:** The core data hooks (`useExpenses`, `useIncomes`, `useGroups`) and main page (`Index.tsx`) show high churn, indicating either feature instability or insufficient abstraction.

---

## 3. Cross-Cutting Concerns

### 3.1 Currency Conversion (CRITICAL)

**The most dangerous cross-cutting concern in this codebase.**

```
Expenses: stored in kr (kronor)
Incomes:  stored in öre (cents) = kr × 100
```

**Impact:** 62 occurrences of `toKronor|toOre|formatCurrency` across 16 files.

**Affected files:**
- `src/lib/balanceUtils.ts:73` - converts income to kr
- `src/hooks/useSettlements.tsx` - settlement amount conversion
- `src/components/ImportModal.tsx` - import conversion
- `src/pages/Analys.tsx` - display formatting
- All modal forms that handle amounts

**Risk:** Missing a conversion results in 100x calculation errors. This has already caused bugs (see commit history: `fix(settlements): convert amounts between kronor and öre`).

### 3.2 Error Handling (Inconsistent)

**197 toast calls** across 27 files with inconsistent patterns:

| Pattern | Count | Files |
|---------|-------|-------|
| `toast.error()` / `toast.success()` | 197 | 27 |
| `handleError()` (centralized) | 5 | 1 (`errorHandling.ts`) |
| Raw `catch (error)` | 50 | 17 |

**Problem:** `errorHandling.ts` has a good framework (categories, severity, logging) but it's not universally applied.

### 3.3 Modal State Management

No central pattern for modal management. Each page manages its own:

```typescript
// src/pages/Index.tsx pattern (repeated in other pages)
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
const [isSwishModalOpen, setIsSwishModalOpen] = useState(false);
// ... 3 more
```

**Problem:** Prop drilling modal callbacks through component trees.

### 3.4 Type Safety Gaps

**14 instances of `: any` type:**
```
src/hooks/useExpenses.tsx:286    - error handler
src/hooks/useExpenses.tsx:376    - error handler
src/hooks/useIncomes.tsx:242     - error handler
src/hooks/useIncomes.tsx:317     - error handler
src/components/analytics/*.tsx   - 10 instances (Recharts callbacks)
```

**Problem:** Recharts doesn't provide good TypeScript types for callbacks.

---

## 4. Copy-Paste Growth Patterns

### 4.1 Modal Components (Structural Duplication)

| Component | LOC | Pattern |
|-----------|-----|---------|
| `AddTransactionModal.tsx` | 710 | Form + validation + submit |
| `AddExpenseModal.tsx` | 429 | Form + validation + submit |
| `AddIncomeModal.tsx` | 346 | Form + validation + submit |
| `EditExpenseModal.tsx` | 399 | Form + validation + submit |
| `EditIncomeModal.tsx` | ~300 | Form + validation + submit |
| `BudgetSettingsModal.tsx` | 505 | Form + validation + submit |

**6 modal components share 70%+ structural similarity.**

### 4.2 Data Hooks (Query Pattern Duplication)

| Hook | LOC | Pattern |
|------|-----|---------|
| `useExpenses.tsx` | 396 | Query + CRUD mutations + error handling |
| `useIncomes.tsx` | 337 | Query + CRUD mutations + error handling |
| `useSettlements.tsx` | ~200 | Query + CRUD mutations + error handling |
| `useSavingsProjects.tsx` | 408 | Query + CRUD mutations + error handling |
| `useBudgets.tsx` | 218 | Query + CRUD mutations + error handling |

**All 5 hooks follow identical patterns** with different entity types. Could be generated or use a factory pattern.

### 4.3 Analytics Charts (Tooltip Duplication)

```typescript
// This pattern appears in 5 chart components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border ...">
        {/* Tooltip content */}
      </div>
    );
  }
  return null;
};
```

---

## 5. Dependency Risks

### Heavy Dependencies

| Package | Size | Risk |
|---------|------|------|
| `exceljs` | Large | Used only for import feature, loads on page |
| `recharts` | Large | Charts, tree-shakeable but full bundle likely loaded |
| `framer-motion` | Medium | Animation, could be lazy-loaded |

### Tight Coupling

```
balanceUtils ←→ currency (bidirectional dependency)
categoryMatcher ←→ fileParser (import workflow coupling)
All pages ←→ hooks/ ←→ types.ts (deep dependency chain)
```

---

## 6. Future Rot Predictions

### 6-Month Horizon

1. **Currency conversion bugs will recur.** Without type-level enforcement (branded types like `KronorAmount`), developers will forget conversions.

2. **ImportModal.tsx will become unmaintainable.** At 875 lines with mixed concerns, any new import format will increase complexity exponentially.

3. **Modal state explosion.** Each new feature requiring a modal adds 2 useState calls and callback props. Index.tsx already has 6.

4. **Category matcher performance.** Currently O(n) with 67 patterns. Adding more merchants will linearly degrade import performance.

### 12-Month Horizon

1. **Test coverage gap will cause regressions.** Only 2 test files exist. Core calculation logic (`balanceUtils`) is tested but UI flows are not.

2. **Error handling inconsistency will make debugging difficult.** Without centralized error tracking, production issues will be hard to trace.

3. **React Query cache complexity.** The hierarchical query key system is powerful but poorly documented. New developers will invalidate incorrectly.

4. **Duplicate code will diverge.** The 6 modal components will develop inconsistent behaviors as features are added to some but not others.

---

## 7. Onboarding Difficulty Assessment

| Area | Difficulty | Blockers |
|------|------------|----------|
| Understanding data flow | **High** | Currency kr/öre split, undocumented query keys |
| Adding new expense feature | **Medium** | Need to understand balanceUtils, queryKeys |
| Adding new category | **Low** | Clear pattern in types.ts, categoryMatcher |
| Modifying import flow | **Very High** | 875-line monolith, file format detection, AI integration |
| Understanding settlements | **High** | Complex balance algorithm, underdocumented |

**Estimated new developer ramp-up: 2-3 weeks** before productive contributions (vs 1 week industry norm for codebase this size).

---

## 8. Bug Surface Growth Prediction

| Area | Current Risk | 6mo Risk | 12mo Risk | Primary Factor |
|------|--------------|----------|-----------|----------------|
| Currency calculations | Medium | **High** | **Critical** | No type enforcement |
| Balance settlements | Medium | Medium | High | Algorithm complexity |
| Import parsing | Low | Medium | Medium | New format additions |
| Modal forms | Low | Medium | High | Duplication divergence |
| Cache staleness | Low | Medium | **High** | Query key complexity |

---

## 9. Entropy Score Summary

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Complexity Concentration** | 7/10 | 3 files contain 30% of complexity |
| **Churn/Complexity Correlation** | 8/10 | Highest churn files are also most complex |
| **Type Safety** | 6/10 | Good overall, gaps in charts and error handlers |
| **Test Coverage** | 2/10 | Only 2 test files for critical paths |
| **Error Handling Consistency** | 4/10 | Framework exists but not applied |
| **Documentation** | 6/10 | Types documented, algorithms not |
| **Duplication** | 6/10 | Modal and hook patterns highly duplicated |

**Overall Entropy Score: 5.6/10** (Moderate debt, intervention recommended)
