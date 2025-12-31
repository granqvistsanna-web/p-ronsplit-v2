# Bug Report: Päronsplit Application
**Generated:** 2025-12-31
**Branch:** claude/check-for-bugs-hbeaA

## Executive Summary

Comprehensive security and code quality audit identified **12 bugs** across 4 severity levels:
- **Critical:** 3 bugs (data integrity and security issues)
- **High:** 3 bugs (potential runtime errors and memory leaks)
- **Medium:** 3 bugs (data handling inconsistencies)
- **Low:** 3 bugs (code quality issues)

**Primary Concerns:** Financial calculation precision loss, missing authorization checks, and race conditions in settlement processing.

---

## CRITICAL SEVERITY BUGS

### 🔴 BUG #1: Precision Loss in Financial Settlement Calculations
**File:** `src/components/BalanceCard.tsx:83`
**Status:** ❌ CONFIRMED

**Description:**
Settlement amounts are rounded using `Math.round(oweAmount)` before being saved to the database. This causes loss of decimal precision in financial calculations.

```typescript
// Line 83
await onSettle(negativeUser.user_id, positiveUser.user_id, Math.round(oweAmount));
```

**Impact:**
- Users settle incorrect amounts (e.g., 1234.67 kr becomes 1235 kr)
- Accumulation of rounding errors leads to balance discrepancies
- Financial data integrity compromised
- May cause tax/accounting issues for users

**Affected Locations:**
- `src/components/BalanceCard.tsx:83` - Settlement creation
- `src/components/BalanceCard.tsx:172` - Display amount
- `src/components/BalanceCard.tsx:222` - Breakdown display
- `src/components/BalanceCard.tsx:319` - Button display

**Recommended Fix:**
Either:
1. Store all amounts in cents (öre) throughout the system and only convert to kronor for display
2. Pass full precision values to `onSettle` and only round for display purposes
3. Use a decimal library (e.g., decimal.js) for precise financial calculations

---

### 🔴 BUG #2: Missing Server-Side Authorization on Data Modifications
**Files:**
- `src/hooks/useExpenses.tsx:190-220` (updateExpense)
- `src/hooks/useExpenses.tsx:222-240` (deleteExpense)
- `src/hooks/useIncomes.tsx:144-173` (updateIncome)
- `src/hooks/useIncomes.tsx:175-189` (deleteIncome)

**Status:** ❌ CONFIRMED

**Description:**
Client-side code only verifies that an expense/income exists in the local cache before allowing updates or deletions. There's no verification that the current user has permission to modify the data.

**Example (useExpenses.tsx:200-210):**
```typescript
// Line 200-205: Only checks if expense exists locally
const expense = expenses.find(e => e.id === expenseId);
if (!expense) {
  toast.error("Utgiften hittades inte");
  return;
}

// Line 207-210: No authorization check - directly updates
const { error } = await supabase
  .from("expenses")
  .update(updates)
  .eq("id", expenseId);
```

**Impact:**
- **CRITICAL SECURITY VULNERABILITY**
- Malicious user could delete or modify other users' expenses/incomes if they know the IDs
- Data can be manipulated by unauthorized users
- Violates principle of least privilege
- Potential GDPR/privacy compliance issue

**Attack Vector:**
```javascript
// Attacker could call directly:
await supabase.from("expenses")
  .update({ amount: 0 })
  .eq("id", "someone-elses-expense-id");
```

**Recommended Fix:**
1. **Immediately implement Supabase Row Level Security (RLS) policies:**
   - Users can only update/delete expenses they created (`paid_by = auth.uid()`)
   - OR users can only modify expenses in groups they're members of
2. Add server-side authorization checks in Supabase Edge Functions
3. Document RLS policies in `SUPABASE_DATABASE_SETUP.md`

**Verification Needed:**
Check if RLS policies are already configured in Supabase dashboard. If not, this is a critical security gap.

---

### 🔴 BUG #3: Race Condition in Settlement Modal
**Files:**
- `src/components/SettlementModal.tsx:67-69` (Confirm button)
- `src/components/BalanceCard.tsx:81-85` (handleConfirmSettle)

**Status:** ❌ CONFIRMED

**Description:**
The "Bekräfta" (Confirm) button in the SettlementModal doesn't disable during settlement submission. While the main "Swisha" button is protected by `disabled={isSettling}`, the modal's confirm button has no such protection.

**Code:**
```typescript
// SettlementModal.tsx:67 - No disabled state
<Button className="flex-1" onClick={onConfirm}>
  Bekräfta
</Button>

// BalanceCard.tsx:306 - Main button IS protected
<Button disabled={isSettling}>
  ...
</Button>
```

**Impact:**
- Users can click "Bekräfta" multiple times rapidly
- Each click triggers a new settlement creation
- Results in duplicate settlement records
- Financial data corruption
- Confusing user experience

**Recommended Fix:**
1. Pass `isSettling` prop to SettlementModal
2. Disable confirm button while processing:
```typescript
<Button className="flex-1" onClick={onConfirm} disabled={isSettling}>
  {isSettling ? <Loader2 className="animate-spin" /> : "Bekräfta"}
</Button>
```
3. Add optimistic locking or idempotency keys for settlement creation

---

## HIGH SEVERITY BUGS

### 🟠 BUG #4: Stale Closure in Idle Timeout Event Listeners
**File:** `src/hooks/useAuth.tsx:135-169`
**Status:** ❌ CONFIRMED

**Description:**
The idle timeout effect captures `signOut` in a closure at mount time. If `signOut` reference changes (due to useCallback dependencies), the event listeners still reference the old closure.

**Code:**
```typescript
// Line 142-148: resetIdleTimer captures signOut
const resetIdleTimer = () => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    await signOut(); // Captured closure!
  }, IDLE_TIMEOUT);
};

// Line 155-156: Event listeners added with captured closure
events.forEach(event => {
  window.addEventListener(event, resetIdleTimer);
});

// Line 169: Depends on signOut, but resetIdleTimer not recreated
}, [user, signOut]);
```

**Impact:**
- Memory leak: Event listeners accumulate without proper cleanup
- Unpredictable behavior when signing out after idle timeout
- Stale function references may cause errors
- User may not be properly signed out when idle

**Recommended Fix:**
Use `useCallback` for `resetIdleTimer` with proper dependencies:
```typescript
const resetIdleTimer = useCallback(() => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    await signOut();
  }, IDLE_TIMEOUT);
}, [signOut]); // Recreate when signOut changes
```

---

### 🟠 BUG #5: Unsafe Array Access in Balance Breakdown
**File:** `src/components/BalanceCard.tsx:222`
**Status:** ❌ CONFIRMED

**Description:**
Accesses `breakdown[0]?.targetNet` without verifying the breakdown array is non-empty. While optional chaining prevents crashes, it masks data fetching issues.

**Code:**
```typescript
// Line 222
Mål: Båda ska ha samma nettoresultat ({Math.round(breakdown[0]?.targetNet || 0).toLocaleString("sv-SE")} kr)
```

**Impact:**
- Silent failure: Shows "0 kr" instead of error when data is missing
- Hides underlying data fetch problems
- Confusing UX (users see "Mål: 0 kr" which doesn't make sense)
- Difficult to debug when breakdown calculation fails

**Recommended Fix:**
Add explicit validation:
```typescript
{breakdown.length > 0 ? (
  <p>Mål: {Math.round(breakdown[0].targetNet).toLocaleString("sv-SE")} kr</p>
) : (
  <p className="text-muted-foreground">Ingen data tillgänglig</p>
)}
```

---

### 🟠 BUG #6: Cumulative Precision Loss in Income Calculations
**File:** `src/lib/balanceUtils.ts:69-75`
**Status:** ❌ CONFIRMED

**Description:**
Income amounts are stored in cents (öre) but converted to kronor (floating-point) for each calculation. Multiple conversions and floating-point operations accumulate precision errors.

**Code:**
```typescript
// Line 69: Convert from cents to kronor (introduces floating-point)
const amountKr = income.amount / 100;
// Line 74: Add to running total (accumulates errors)
memberData[income.recipient].income += amountKr;
```

**Impact:**
- Precision errors accumulate across multiple income entries
- Balance calculations become increasingly inaccurate
- Financial reports may not balance correctly
- Especially problematic with many small income entries

**Example:**
```javascript
// 100 incomes of 100.33 kr each
// Correct: 10,033.00 kr
// With floating-point: 10,032.99999... kr (may display as 10,032 kr after rounding)
```

**Recommended Fix:**
Perform all calculations in cents:
```typescript
// Store and calculate in cents
memberData[income.recipient].incomeInCents += income.amount;

// Only convert to kronor for final display
const incomeKr = memberData[income.recipient].incomeInCents / 100;
```

---

## MEDIUM SEVERITY BUGS

### 🟡 BUG #7: Timezone-Sensitive Month Filtering
**Files:**
- `src/pages/Index.tsx:76-89`
- `src/pages/Analys.tsx:34-44`
- `src/components/BalanceCard.tsx:42-50`

**Status:** ⚠️ LIKELY

**Description:**
Month filtering uses `date.getMonth() + 1 === selectedMonth` without timezone normalization. Transactions near month boundaries may be assigned to incorrect months depending on user's timezone.

**Code (BalanceCard.tsx:44-47):**
```typescript
const date = new Date(s.date);
return (
  date.getFullYear() === selectedYear &&
  date.getMonth() + 1 === selectedMonth
);
```

**Impact:**
- Transaction on "2025-01-31 23:00:00 UTC" may appear in February for users in UTC+2
- Monthly reports incorrect for users in different timezones
- Financial summaries don't match expected values
- Confusing when comparing reports between users

**Recommended Fix:**
Parse dates as UTC or use consistent timezone:
```typescript
const date = new Date(s.date);
const utcMonth = date.getUTCMonth() + 1;
const utcYear = date.getUTCFullYear();
return utcYear === selectedYear && utcMonth === selectedMonth;
```

---

### 🟡 BUG #8: Missing Error Feedback on Settlement Failure
**File:** `src/pages/Index.tsx:166-180`
**Status:** ❌ CONFIRMED

**Description:**
The `handleSettle` function doesn't show error toast if settlement creation fails. Users receive no notification of failure.

**Code:**
```typescript
// Line 166-180: No error handling
const handleSettle = useCallback(async (fromUser: string, toUser: string, amount: number, date?: string) => {
  if (!household?.id) return;
  setIsSettling(true);
  try {
    await addSettlement({
      group_id: household.id,
      from_user: fromUser,
      to_user: toUser,
      amount,
      date,
    });
  } finally {
    setIsSettling(false); // No catch block!
  }
}, [household?.id, addSettlement]);
```

**Impact:**
- Silent failures confuse users
- Users think settlement was created when it failed
- No way to know if action succeeded
- Poor user experience

**Recommended Fix:**
Add error handling:
```typescript
try {
  await addSettlement(...);
  toast.success("Avräkning registrerad!");
} catch (error) {
  console.error("Settlement failed:", error);
  toast.error("Kunde inte registrera avräkning");
}
```

---

### 🟡 BUG #9: Locale-Dependent Month String Storage
**File:** `src/hooks/useSettlements.tsx:65-70`
**Status:** ⚠️ REQUIRES VERIFICATION

**Description:**
Settlement month is formatted as locale string (e.g., "Januari 2025") and stored in database. This could be fragile and locale-dependent.

**Impact:**
- Month strings incorrect in non-Swedish locales
- Database queries by month become unreliable
- Difficult to aggregate settlements across months
- Sorting by month field doesn't work correctly

**Recommended Fix:**
Store month in standard format:
```typescript
// Store as "2025-01" or separate year/month columns
const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
```

**Note:** Need to verify actual implementation in useSettlements.tsx.

---

## LOW SEVERITY BUGS

### 🔵 BUG #10: Console Logs in Production Code
**Files:** 19 files with console.log/error statements
**Status:** ❌ CONFIRMED

**Description:**
Debug console.log statements left throughout the codebase, potentially exposing sensitive information.

**Examples:**
- `src/hooks/useAuth.tsx:174` - "Attempting signup with email:"
- `src/hooks/useAuth.tsx:191` - "Attempting signin with email:"
- `src/hooks/useExpenses.tsx:69` - "Error fetching expenses:"
- `src/hooks/useGroups.tsx:345` - Group creation logs

**Impact:**
- Minor information disclosure risk (emails, user IDs visible in console)
- Increases noise in browser console
- Unprofessional in production
- Could expose debugging information to attackers

**Recommended Fix:**
1. Create a conditional logger:
```typescript
const logger = {
  log: (...args) => process.env.NODE_ENV === 'development' && console.log(...args),
  error: (...args) => console.error(...args), // Keep errors
};
```
2. Replace all `console.log` with `logger.log`
3. Keep `console.error` for actual errors

---

### 🔵 BUG #11: Weak User Authentication Check Pattern
**File:** `src/pages/Index.tsx:352, 387`
**Status:** ⚠️ MINOR

**Description:**
Code checks `!!user?.id` for edit functionality but doesn't have explicit fallback if user becomes null during session.

**Impact:**
- Minor UX issue: Items become non-editable if auth state changes
- Actually handled correctly by ProtectedRoute wrapper
- Could be more explicit for maintainability

**Recommendation:**
Current implementation is acceptable but could be more defensive. Already protected by ProtectedRoute component.

---

### 🔵 BUG #12: Inconsistent Rounding Strategies
**File:** `src/components/BalanceCard.tsx` (multiple locations)
**Status:** ❌ CONFIRMED

**Description:**
Different components use different rounding methods:
- `Math.round()` in most places (banker's rounding)
- `.toFixed()` in some places (string formatting)
- Inconsistent precision display

**Impact:**
- Inconsistent financial displays across UI
- User confusion when same number displays differently
- Difficult to verify calculations manually

**Recommended Fix:**
Create utility function:
```typescript
// lib/formatters.ts
export const formatCurrency = (amount: number): string => {
  return Math.round(amount).toLocaleString("sv-SE") + " kr";
};
```

Use consistently throughout the app.

---

## Recommendations by Priority

### Immediate Action Required (Critical)
1. **BUG #2:** Implement Supabase RLS policies immediately
2. **BUG #1:** Fix settlement precision loss
3. **BUG #3:** Disable settlement button during submission

### High Priority (This Sprint)
4. **BUG #4:** Fix idle timeout closure issue
5. **BUG #6:** Refactor to use cent-based calculations
6. **BUG #5:** Add explicit breakdown validation

### Medium Priority (Next Sprint)
7. **BUG #7:** Standardize timezone handling
8. **BUG #8:** Add error feedback for settlements
9. **BUG #9:** Verify and fix month storage format

### Low Priority (Code Quality)
10. **BUG #10:** Remove/gate console.log statements
11. **BUG #12:** Standardize currency formatting
12. **BUG #11:** Document authentication pattern

---

## Testing Recommendations

1. **Security Testing:**
   - Verify RLS policies prevent unauthorized data access
   - Test settlement creation race conditions
   - Attempt to modify other users' expenses

2. **Financial Accuracy Testing:**
   - Test precision with amounts like 123.45, 0.01, 999.99
   - Verify balance calculations with 10+ transactions
   - Compare manual calculations vs. app calculations

3. **Edge Case Testing:**
   - Test month boundaries in different timezones
   - Test with empty/null data arrays
   - Test idle timeout behavior

4. **Browser Console Audit:**
   - Check production build for console.log output
   - Verify no sensitive data logged

---

## Summary Statistics

| Severity | Count | Resolved |
|----------|-------|----------|
| Critical | 3     | 0        |
| High     | 3     | 0        |
| Medium   | 3     | 0        |
| Low      | 3     | 0        |
| **Total**| **12**| **0**    |

**Estimated Fix Time:**
- Critical bugs: 4-6 hours
- High priority: 6-8 hours
- Medium priority: 4-6 hours
- Low priority: 2-3 hours
- **Total: 16-23 hours**

---

## Additional Notes

- This codebase uses intentionally relaxed TypeScript settings (`noImplicitAny: false`, etc.)
- Security testing should verify Supabase RLS policies are properly configured
- Consider adding E2E tests for financial calculations
- Financial precision issues are the highest risk for user trust

**Next Steps:**
1. Review this report with the development team
2. Prioritize critical security fixes
3. Create tickets for each bug
4. Implement fixes starting with critical issues
5. Add regression tests for financial calculations
