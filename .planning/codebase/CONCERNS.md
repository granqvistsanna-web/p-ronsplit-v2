# Codebase Concerns

**Analysis Date:** 2026-01-27

## Critical Security Issues

**Hardcoded Supabase Credentials in Source Code:**
- Issue: Supabase URL and publishable API key are embedded directly in `src/integrations/supabase/client.ts` (lines 5-6) and duplicated in `.env.example`. These credentials are visible in version control history and compiled bundles.
- Files: `src/integrations/supabase/client.ts`
- Impact: Production API keys exposed to anyone with repository access or ability to read bundled JavaScript. High-severity data breach risk.
- Fix approach: Move credentials to environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) via .env file, never commit actual values. Strip hardcoded values from git history using git-filter-branch or BFG Repo-Cleaner.

**localStorage Used for Auth Persistence:**
- Issue: `src/integrations/supabase/client.ts` line 16 uses localStorage for session persistence, storing auth tokens in plain text accessible via browser DevTools and XSS attacks.
- Files: `src/integrations/supabase/client.ts`
- Impact: Session hijacking vulnerability - attacker with XSS access can steal auth tokens and impersonate users. Tokens persist across page refreshes and browser sessions.
- Fix approach: Consider sessionStorage (cleared on browser close) or httpOnly cookie alternatives. Implement Content Security Policy (CSP) to mitigate XSS vectors. Add token rotation and expiration monitoring.

**Account Deletion Edge Cases:**
- Issue: `src/hooks/useAuth.tsx` deleteAccount (lines 296-333) calls an edge function but doesn't validate response or handle partial deletion scenarios (user auth deleted but database profile remains).
- Files: `src/hooks/useAuth.tsx`
- Impact: Orphaned user records in database. Ghost accounts consuming resources and potentially leaking user metadata.
- Fix approach: Validate deletion completion before signout. Implement transactional guarantees in edge function. Add retry logic and error-specific messaging for different failure modes.

## Known Bugs and Edge Cases

**Profile Fetch Race Condition:**
- Issue: `src/hooks/useAuth.tsx` fetchProfile (lines 45-87) retries up to 3 times with exponential backoff, but doesn't handle scenario where profile is created by database trigger during retry window.
- Files: `src/hooks/useAuth.tsx` lines 64-69
- Impact: Profile may not load on first sign-up despite being created by trigger. User sees loading state or blank profile. Retry timeout set to 5 seconds (line 101) - too aggressive for slow database responses.
- Fix approach: Increase retry backoff window from 100ms to 500ms exponential growth. Consider polling approach with longer timeout (10-15 seconds). Add logging to distinguish "never created" from "not yet created" states.

**Floating Point Precision in Financial Calculations:**
- Issue: Multiple files use direct JavaScript floating-point arithmetic for currency values (amounts in krona) without rounding safeguards.
- Files: `src/lib/balanceUtils.ts` (lines 62, 74, 88, 100, 110-114), `src/components/AddExpenseModal.tsx` (lines 64-69, 108), `src/hooks/useExpenses.tsx` (lines 43-45)
- Impact: Accumulation of rounding errors over multiple transactions. Balance calculations can drift by 0.01-0.10 kr per transaction. Critical for financial accuracy.
- Fix approach: Use integer arithmetic (amounts in öre/cents) throughout or implement Decimal.js library. Add rounding tests with 100+ transaction scenarios. Round final display values to 2 decimals using toFixed(2) + parseFloat for storage.

**Import File Parser HTML Handling:**
- Issue: `src/lib/fileParser.ts` parseExcelText (lines 56-71) detects HTML but returns null without attempting to parse it. Falls back to CSV which may misparse HTML table structure.
- Files: `src/lib/fileParser.ts` lines 56-71
- Impact: Bank exports in HTML format silently fail. User gets zero transactions imported with no clear error message why. Data loss without user awareness.
- Fix approach: Parse HTML table cells before falling back to CSV. Add explicit error toast for HTML-format files. Log which format was detected for debugging.

**Duplicate Detection Silently Fails:**
- Issue: `src/components/AddExpenseModal.tsx` checkForDuplicates (lines 117-140) catches errors and returns empty array, hiding network/function failures.
- Files: `src/components/AddExpenseModal.tsx` lines 117-140
- Impact: Duplicate checks disabled during network outages. Users can create undetected duplicates. No user feedback that check failed.
- Fix approach: Distinguish between "no duplicates found" (empty array) and "check failed" (error state). Show warning toast when duplicate check fails. Optionally block submission if critical check unavailable.

## Performance Bottlenecks

**Unoptimized List Rendering in ImportModal:**
- Issue: `src/components/ImportModal.tsx` renders all imported transactions with framer-motion animations (lines 601-616) without virtualization. Delays and stagger on every transaction.
- Files: `src/components/ImportModal.tsx` lines 601-616
- Impact: UI freezes when importing 100+ transactions from bank export. Each transaction motion animation adds ~20ms delay. Stagger animation multiplies to seconds.
- Fix approach: Use react-window or react-virtualized to render visible items only. Remove stagger animation or increase delay to 5ms. Test with 500-transaction imports.

**React Query Persistence Large Dataset:**
- Issue: `src/App.tsx` uses PersistQueryClientProvider (line 52) with localStorage persister. All cached queries written to localStorage on every mutation.
- Files: `src/App.tsx` line 52-54
- Impact: localStorage bloat with large expense datasets (1000+ transactions). Browser becomes sluggish. Sync/serialization takes 100-500ms per mutation.
- Fix approach: Implement selective persistence - only cache critical data (group metadata, user profile). Skip persisting large expense lists. Use IndexedDB instead of localStorage for large datasets.

**Balance Calculation Linear Complexity:**
- Issue: `src/lib/balanceUtils.ts` calculateBalance (lines 41-122) iterates settlements and members sequentially. O(n*m) complexity for n settlements and m members.
- Files: `src/lib/balanceUtils.ts` lines 103-116
- Impact: Household with 10+ members and 1000+ settlement records experiences 1-2 second calculation lag. No memoization between renders.
- Fix approach: Use Map/Set for O(1) lookups instead of nested loops. Memoize results based on input hashes. Consider separating settlement loop into pre-calculated aggregate.

## Fragile Areas

**Modal State Management in Components:**
- Issue: Multiple modal components (AddExpenseModal, ImportModal, EditExpenseModal) manage independent open/close state via parent-passed props without standardized patterns.
- Files: `src/components/AddExpenseModal.tsx`, `src/components/ImportModal.tsx`, `src/components/EditExpenseModal.tsx`, `src/components/AddIncomeModal.tsx`, etc.
- Why fragile: Easy to leave modals open during navigation. No guarantee modal state syncs with parent. Each modal reinvents close logic. Hard to test modal sequences.
- Safe modification: Create useModal hook that standardizes open/close/reset lifecycle. Add modal dismissal on route change. Test modal cleanup on unmount.
- Test coverage: No unit tests for modal open/close sequences. No integration tests for multi-modal workflows.

**Group Member Permissions Not Enforced:**
- Issue: All data operations assume user is group member without runtime validation. Frontend filters by user ID but backend access control unclear.
- Files: `src/hooks/useGroups.tsx`, `src/hooks/useExpenses.tsx`, `src/hooks/useIncomes.tsx` - all call Supabase without explicit permission checks
- Why fragile: User can modify URL/groupId and potentially access unauthorized groups. No RLS policies visible in source.
- Safe modification: Add explicit group membership check before any query. Pass group_id and user_id to validate in Supabase RLS policies. Test with unauthorized user IDs.
- Test coverage: No tests for unauthorized access attempts.

**Custom Expense Splits Complex Logic:**
- Issue: `src/components/AddExpenseModal.tsx` custom split implementation (lines 37-115) involves string-to-number conversions, floating-point validation, and split-to-amount reconciliation across multiple state updates.
- Files: `src/components/AddExpenseModal.tsx` lines 37-115
- Why fragile: Easy to introduce rounding errors when toggling custom splits. Multiple dependencies (amount, members, useCustomSplit) can trigger stale calculations. No unit tests.
- Safe modification: Extract split calculation to pure function with explicit tests. Use BigDecimal for splits validation. Add visual validation feedback for split totals.
- Test coverage: No tests for split rounding, member count changes, or amount updates while splits active.

**Large Component Files Difficult to Test:**
- Issue: Settings.tsx (886 lines), ImportModal.tsx (752 lines), Analys.tsx (720 lines), AddTransactionModal.tsx (703 lines) bundle UI, logic, and state in single files.
- Files: `src/pages/Settings.tsx`, `src/components/ImportModal.tsx`, `src/pages/Analys.tsx`, `src/components/AddTransactionModal.tsx`
- Why fragile: Hard to test individual logic paths. Changes to UI can break logic. Deep nesting makes mocking difficult.
- Safe modification: Extract data-fetching and calculation logic to custom hooks. Create presentation components separately. Add unit tests to hooks before refactoring UI.
- Test coverage: No unit or integration tests exist for any business logic.

## Missing Critical Features / Infrastructure

**No Comprehensive Error Logging System:**
- Issue: `src/lib/errorHandling.ts` provides in-memory error log (max 50 errors, line 48) with no persistence, no external service integration.
- Files: `src/lib/errorHandling.ts` lines 45-48
- Impact: Production errors disappear on page refresh. No visibility into user-facing failures. No alerting for critical errors. Stack traces lost.
- Fix approach: Integrate Sentry or similar service (commented code at line 114-116 suggests intent). Implement log export for support team. Add error threshold alerts.

**No Testing Infrastructure:**
- Issue: No test files exist in src directory. No test runner configured (jest/vitest not in dependencies).
- Files: None - this is a gap
- Impact: No safeguards against regressions. Refactors are high-risk. Complex logic (balance calculations, splits) untested. Manual QA required for every change.
- Fix approach: Add vitest as dev dependency. Create test files co-located with source. Start with unit tests for utils and hooks. Target 60%+ coverage for critical paths.

**No Input Validation Schema:**
- Issue: Form inputs validated inline with toast error messages. No centralized schema validation (Zod is installed but unused for data validation).
- Files: `src/components/AddExpenseModal.tsx` lines 71-115, `src/components/AddIncomeModal.tsx`, etc.
- Impact: Invalid data can be submitted if frontend validation bypassed. Inconsistent error messages. Hard to maintain validation rules.
- Fix approach: Create Zod schemas for Expense, Income, Contribution types. Use in components via react-hook-form integration. Share schemas between frontend and edge functions.

## Test Coverage Gaps

**Untested Core Business Logic:**
- What's not tested: Balance calculations, settlement logic, expense split handling, income distribution, monthly recurring expenses
- Files: `src/lib/balanceUtils.ts`, `src/lib/incomeUtils.ts`, `src/hooks/useExpenses.tsx` (repeat expense logic unclear), all balance-related components
- Risk: Critical math errors silently accumulate. User sees incorrect balances. Financial disputes from calculation bugs. High impact if triggered.
- Priority: HIGH - balance calculations are core feature

**Untested Data Import:**
- What's not tested: CSV/Excel parsing for various bank formats, duplicate detection logic, transaction categorization, date parsing for different locales
- Files: `src/lib/fileParser.ts` (475 lines with no tests), `src/components/ImportModal.tsx`
- Risk: Bank imports silently fail or misparse. Users lose financial data. Different bank formats break without warning.
- Priority: HIGH - import is common user action

**Untested Authentication Flows:**
- What's not tested: Sign-up email verification, password reset, profile fetch retries, session timeout, concurrent auth state changes
- Files: `src/hooks/useAuth.tsx`, `src/pages/Auth.tsx`, `src/pages/VerifyEmail.tsx`
- Risk: Auth state inconsistencies. Users locked out. Session tokens not refreshed.
- Priority: HIGH - affects all users

**Untested Modal Interactions:**
- What's not tested: Modal opening/closing sequences, form submission in modals, error states in modals, keyboard navigation
- Files: All modal components - `src/components/*Modal.tsx`
- Risk: Modal stuck open or closed. Form data lost on cancel. Keyboard traps for accessibility.
- Priority: MEDIUM - impacts UX but workaround exists (page reload)

## Scaling Limits

**Browser localStorage Limits:**
- Current capacity: ~5-10MB depending on browser
- Limit: With React Query persistence, ~2000-3000 transactions cached before hitting limit
- Scaling path: Implement IndexedDB (50MB+) for persistent cache. Implement query-level persistence strategy (cache only recent transactions). Add cache size monitoring.

**Supabase Real-time Subscriptions:**
- Current capacity: Each user connection opens WebSocket. Heavy households with many group members create multiple subscriptions.
- Limit: Platform may throttle if 100+ active subscriptions per user
- Scaling path: Implement debounced refresh instead of real-time updates. Aggregate subscriptions by group instead of entity type. Add connection pooling.

**Balance Calculation Performance:**
- Current capacity: Instant calculations for <1000 combined expense/settlement records
- Limit: 5000+ records causes 1-2 second lag. Household with 10+ members experiences noticeable pause.
- Scaling path: Implement calculated columns in Supabase (pre-aggregate by month/person). Cache balances with invalidation on expense change. Consider materialized views.

## Dependencies at Risk

**Outdated React Query Version:**
- Risk: Using @tanstack/react-query ^5.83.0 with known issues in persistence layer
- Impact: Stale cache not properly invalidated in some scenarios. localStorage sync bugs reported in versions 5.80-5.85
- Migration plan: Upgrade to ^5.90.0+ when stable. Review persist-client plugin for known issues.

**ExcelJS Parsing Limitations:**
- Risk: ExcelJS doesn't handle HTML-formatted Excel exports or some proprietary bank formats
- Impact: Import fails silently for some bank types. User assumes data loss without visibility.
- Migration plan: Consider papaparse for CSV + separate HTML parser. Test against 5+ bank export formats.

**Supabase SDK Breaking Changes Risk:**
- Risk: @supabase/supabase-js ^2.90.1 - minor version upgrades may have breaking auth/storage changes
- Impact: Authentication or session persistence could break
- Migration plan: Pin to exact version (2.90.1 not ^2.90.1) until comprehensive test suite exists. Monitor release notes.

## Technical Debt Summary

| Area | Severity | Type | Fix Effort |
|------|----------|------|-----------|
| Hardcoded credentials in source | CRITICAL | Security | 30 min |
| localStorage auth tokens | CRITICAL | Security | 2-4 hours |
| Floating-point financial math | HIGH | Correctness | 4 hours |
| No test infrastructure | HIGH | Quality | 8 hours setup + ongoing |
| Input validation schema missing | HIGH | Quality | 4 hours |
| Large component files | MEDIUM | Maintainability | 8 hours |
| Error logging not persisted | MEDIUM | Operations | 4 hours |
| Balance calc performance | MEDIUM | Performance | 6 hours |
| Modal state not standardized | MEDIUM | Maintainability | 6 hours |
| Import HTML parsing missing | MEDIUM | Functionality | 3 hours |

---

*Concerns audit: 2026-01-27*
