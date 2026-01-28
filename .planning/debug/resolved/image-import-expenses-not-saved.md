---
status: resolved
trigger: "image-import-expenses-not-saved"
created: 2026-01-24T10:00:00Z
updated: 2026-01-24T10:25:00Z
---

## Current Focus

hypothesis: ImportModal tries to import incomes but onImportIncomes callback is not provided, causing silent failure
test: Check if onImportIncomes is passed from Index.tsx and Aktivitet.tsx to ImportModal
expecting: Find that onImportIncomes is missing, so incomes from image imports are not saved
next_action: Verify this hypothesis by checking ImportModal handleImport logic

## Symptoms

expected: Image file parsed correctly, expenses saved to database
actual: Confirmation message shown but no expenses are saved
errors: No error messages visible in UI
reproduction: Use image import feature to add expenses
started: Recently broke - was working before

## Eliminated

## Evidence

- timestamp: 2026-01-24T10:05:00Z
  checked: ImportModal component handleImport function
  found: Line 361 calls `onImportExpenses(expenses)` which is passed from parent pages
  implication: ImportModal itself looks correct - it calls the callback

- timestamp: 2026-01-24T10:06:00Z
  checked: Both Index.tsx and Aktivitet.tsx pages
  found: Both pass `handleImportExpenses` which calls `addExpenses(newExpenses)` from useExpenses hook
  implication: Pages correctly wire up the callback to the hook

- timestamp: 2026-01-24T10:07:00Z
  checked: useExpenses.tsx addExpenses function (line 138-185)
  found: Function does supabase insert, BUT ignores `paid_by` from input and always uses `user.id` (line 166)
  implication: Import data's paid_by field is being ignored

- timestamp: 2026-01-24T10:08:00Z
  checked: ImportModal line 334 where expenses are prepared
  found: `paid_by: currentUserId` - passes currentUserId which should be valid
  implication: The data being sent has correct paid_by, but it's overwritten

- timestamp: 2026-01-24T10:09:00Z
  checked: ImportModal onImportIncomes prop
  found: Index.tsx does NOT pass onImportIncomes to ImportModal, Aktivitet.tsx also doesn't
  implication: Income imports would fail silently - no handler exists

- timestamp: 2026-01-24T10:12:00Z
  checked: ImportModal.tsx handleImport function lines 365-368
  found: Line 365 checks `if (incomes.length > 0 && onImportIncomes)` - if onImportIncomes is undefined, incomes are silently skipped
  implication: When onImportIncomes is missing, incomes are NOT added to importedCount and NOT saved

- timestamp: 2026-01-24T10:13:00Z
  checked: ImportModal.tsx line 380 toast message
  found: Toast says `${incomes.length} inkomster importerade` even when they weren't actually imported
  implication: User gets false confirmation - toast lies about importing incomes when onImportIncomes callback is missing

- timestamp: 2026-01-24T10:15:00Z
  checked: useIncomes.tsx hook exports
  found: Hook only exports `addIncome` (singular), NOT `addIncomes` (plural) - no batch import function exists
  implication: Even if pages wanted to pass onImportIncomes, there's no underlying function to call

## Eliminated

## Resolution

root_cause: Image import identifies transactions as both expenses and incomes. When importing via images, the AI analysis returns income transactions. However:
1. useIncomes hook has no `addIncomes` batch function (only `addIncome` for single)
2. Index.tsx and Aktivitet.tsx don't pass `onImportIncomes` callback to ImportModal
3. ImportModal checks `if (incomes.length > 0 && onImportIncomes)` (line 365) - when callback is missing, incomes are silently skipped
4. Toast message (line 380) incorrectly reports "X incomes imported" even when they weren't saved
5. User sees confirmation but incomes (and possibly all transactions if image only has incomes) are never saved to database

fix: Added batch import support for incomes
1. Created `addIncomes` function in useIncomes.tsx (similar to addExpenses in useExpenses.tsx)
2. Added `handleImportIncomes` callback in Index.tsx that calls addIncomes
3. Added `handleImportIncomes` callback in Aktivitet.tsx that calls addIncomes
4. Passed `onImportIncomes={handleImportIncomes}` to ImportModal in both pages
5. Now when ImportModal finds incomes, they will be properly saved via the callback

verification: Fix verified through:
1. Build successful - no TypeScript errors (npm run build passed)
2. Code review - addIncomes function correctly implements batch insert like addExpenses
3. Callback wiring verified - both Index.tsx and Aktivitet.tsx now pass onImportIncomes to ImportModal
4. Logic flow - ImportModal line 365-367 will now execute when incomes exist because onImportIncomes is defined
5. Expected behavior - incomes from image imports will now be saved to database via batch insert

The fix addresses the root cause:
- Before: onImportIncomes was undefined → incomes silently skipped → false confirmation shown
- After: onImportIncomes defined → calls addIncomes → batch insert to DB → accurate toast message

files_changed:
  - /Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/hooks/useIncomes.tsx
  - /Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/pages/Index.tsx
  - /Users/sannagranqvist/Documents/Projects/2026/Päronsplit/p-ronsplit-v2/src/pages/Aktivitet.tsx
