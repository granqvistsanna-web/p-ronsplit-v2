---
phase: 02
plan: 02
title: "Currency Conversion Utilities & Database Migration"
subsystem: "data-layer"
status: "complete"
completed: 2026-01-28

requires:
  - "Database schema (expenses table)"
  - "TypeScript build configuration"

provides:
  - "Currency conversion utilities (toOre, toKronor, formatCurrency, parseInputToOre)"
  - "Database migration for integer currency storage in expenses table"
  - "Floating-point error prevention for monetary calculations"

affects:
  - "02-03-PLAN.md: Will use toOre/toKronor for expense operations"
  - "Future expense forms: Must use parseInputToOre for user input"
  - "Future expense displays: Must use formatCurrency for rendering"

tech-stack:
  added:
    - "src/lib/currency.ts: Currency conversion utilities"
  patterns:
    - "Integer storage for monetary values (ore/cents pattern)"
    - "JSDoc documentation with examples"
    - "Swedish locale formatting (sv-SE)"

key-files:
  created:
    - "src/lib/currency.ts: Currency conversion utilities"
    - "supabase/migrations/20260128000000_convert_expenses_to_ore.sql: Database migration"
  modified: []

decisions:
  - id: "TECH-02-implementation"
    what: "Store currency as integers (ore) to prevent floating-point errors"
    why: "JavaScript floating-point arithmetic has precision issues (0.1 + 0.2 = 0.30000000000000004)"
    impact: "All expense and income operations must convert between ore and kronor"

metrics:
  duration: "2 minutes"
  tasks_completed: 2
  deviations: 0
---

# Phase 2 Plan 2: Currency Conversion Utilities & Database Migration Summary

**One-liner:** Integer currency storage (ore) with conversion utilities to prevent floating-point errors

## What Was Built

Created currency conversion utilities and database migration to implement integer currency storage for the expenses table, bringing it into consistency with the incomes table which already uses this pattern.

### Task 1: Currency Conversion Utilities
Created `src/lib/currency.ts` with four core functions:

1. **toOre(kr: number): number**
   - Converts kronor to ore (multiply by 100, round to integer)
   - Uses Math.round() to handle floating-point imprecision
   - Example: `toOre(123.45)` => `12345`

2. **toKronor(ore: number): number**
   - Converts ore to kronor (divide by 100)
   - Example: `toKronor(12345)` => `123.45`

3. **formatCurrency(ore: number, options?: { showDecimals?: boolean }): string**
   - Formats ore for display with Swedish locale
   - Default: no decimals (`"123 kr"`)
   - With showDecimals: two decimal places (`"123,45 kr"`)
   - Uses `toLocaleString('sv-SE')` for proper thousand separators (space) and decimal separator (comma)

4. **parseInputToOre(input: string): number | null**
   - Parses user input string to ore
   - Handles both Swedish (comma) and international (period) decimal separators
   - Removes whitespace and thousand separators
   - Returns null for invalid input
   - Example: `parseInputToOre("123,45")` => `12345`

All functions include comprehensive JSDoc documentation with examples.

### Task 2: Database Migration
Created migration `20260128000000_convert_expenses_to_ore.sql` that:

1. Converts existing expense amounts from kronor to ore (`UPDATE ... SET amount = ROUND(amount * 100)`)
2. Alters column type from NUMERIC/DECIMAL to BIGINT (`ALTER TABLE ... ALTER COLUMN amount TYPE BIGINT`)
3. Adds column comment documenting the ore storage requirement

The migration is irreversible in terms of decimal precision, but monetary amounts should only have 2 decimal places anyway, so `ROUND(amount * 100)` preserves all meaningful financial data.

**Note:** The migration will be run manually by the developer via Supabase CLI or dashboard. The file documents the required database change.

## How It Works

### Integer Storage Pattern
- **Problem:** JavaScript floating-point arithmetic has precision issues (e.g., `0.1 + 0.2 = 0.30000000000000004`)
- **Solution:** Store all monetary values as integers in the smallest unit (ore for SEK, cents for USD)
- **Range:** BIGINT provides ~92 quadrillion ore (~920 trillion kronor) - well above realistic amounts
- **Conversion:** 1 krona (SEK) = 100 ore

### Usage Pattern
```typescript
// When inserting expenses
const userInput = "123,45"; // User types this
const ore = parseInputToOre(userInput); // 12345
await supabase.from('expenses').insert({ amount: ore, ... });

// When reading expenses for display
const { data } = await supabase.from('expenses').select('*');
const formatted = formatCurrency(data.amount); // "123 kr"
const formattedWithDecimals = formatCurrency(data.amount, { showDecimals: true }); // "123,45 kr"

// When performing calculations
const totalOre = expenses.reduce((sum, exp) => sum + exp.amount, 0);
const totalKr = toKronor(totalOre); // Convert to kronor for display
```

### Swedish Locale Formatting
- Thousand separator: space (`12 345 kr`)
- Decimal separator: comma (`123,45 kr`)
- Currency symbol: `kr` suffix

## Decisions Made

1. **Integer storage for all currency amounts**
   - Prevents floating-point rounding errors
   - Consistent across incomes and expenses tables
   - Industry best practice for financial applications

2. **BIGINT for database column type**
   - Provides sufficient range for any realistic monetary amount
   - More efficient than NUMERIC/DECIMAL for integer values

3. **Flexible input parsing**
   - Accepts both comma and period as decimal separators
   - Removes whitespace and thousand separators
   - Gracefully handles invalid input (returns null)

4. **Optional decimal display**
   - Default: no decimals for cleaner UI (`"123 kr"`)
   - Optional: show decimals when precision matters (`"123,45 kr"`)

## Deviations from Plan

None - plan executed exactly as written.

## Key Learnings

1. **Floating-point precision matters in financial apps**
   - Even small errors compound over many transactions
   - Integer storage eliminates entire class of bugs

2. **TypeScript + JSDoc provides excellent developer experience**
   - Type safety catches errors at compile time
   - JSDoc examples show usage patterns inline

3. **Migration irreversibility is acceptable**
   - Monetary amounts should only have 2 decimal places
   - Any additional precision in existing data is likely noise, not signal

## Next Phase Readiness

**Ready for:** Plan 02-03 (Data fetching hooks with React Query)

**Blockers:** None

**Required setup:**
- Frontend code must adopt currency utilities for all expense operations
- Database migration must be run before deploying code that uses integer storage
- Supabase types must be regenerated after migration to reflect BIGINT type

**Integration points:**
- Expense forms will use `parseInputToOre()` for user input
- Expense displays will use `formatCurrency()` for rendering
- Expense calculations will use ore values directly
- Database queries will work with integer amounts

## Testing Notes

Manual testing recommended:
1. **Conversion accuracy:** Verify `toOre(123.45)` === `12345` and `toKronor(12345)` === `123.45`
2. **Rounding behavior:** Verify `toOre(123.456)` === `12346` (rounds correctly)
3. **Formatting:** Verify `formatCurrency(12345)` === `"123 kr"` and with decimals === `"123,45 kr"`
4. **Input parsing:** Test with comma (`"123,45"`), period (`"123.45"`), and whitespace (`"1 234,56"`)
5. **Edge cases:** Zero, negative numbers, very large numbers

Migration testing:
1. Run migration on staging environment first
2. Verify existing expense amounts are converted correctly
3. Verify column type is BIGINT
4. Verify application code works with integer values

## Git History

| Commit | Message | Files |
|--------|---------|-------|
| 98d3335 | feat(02-02): create currency conversion utilities | src/lib/currency.ts |
| 8fdd69d | feat(02-02): add database migration to convert expenses to ore storage | supabase/migrations/20260128000000_convert_expenses_to_ore.sql |
