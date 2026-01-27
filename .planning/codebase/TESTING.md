# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Status:** No testing framework currently configured or in use.

**Runner:** Not detected (Jest, Vitest, or other test runners not installed)

**Assertion Library:** Not applicable

**Run Commands:** Not available

**Notes:**
- No test dependencies in `package.json`
- No test files in `src/` directory (only node_modules contains test files from dependencies like Zod)
- No configuration files for Jest (`jest.config.*`) or Vitest (`vitest.config.*`)
- This is a development gap to address: the project has 124 TypeScript files but zero tests

## Test File Organization

**Location:** Not applicable (no tests exist)

**Naming Convention:** Not applicable

**Proposed Structure (when testing is added):**
- Co-located tests: place `.test.ts` / `.test.tsx` next to source files
- Shared test utilities: `src/__tests__/` or `src/test-utils/`
- Fixtures: `src/__fixtures__/` for mock data

## Test Structure

**Not Applicable:** No test suites exist in the codebase.

**Recommended approach when implemented:**
- Use Jest or Vitest (Vitest recommended for Vite projects)
- Organize tests by feature/component
- Use describe blocks for grouping related tests
- Clear naming: describe what the code does, not the mechanics

**Example structure to implement:**
```typescript
describe('AddExpenseModal', () => {
  describe('form validation', () => {
    it('should show error if amount is missing', () => {
      // test code
    });

    it('should show error if split sum does not match total amount', () => {
      // test code
    });
  });

  describe('split calculations', () => {
    it('should divide amount equally among members', () => {
      // test code
    });
  });
});
```

## Mocking

**Framework:** Not applicable (no testing framework in place)

**When Testing is Implemented:**
- Mock Supabase client: `src/integrations/supabase/client.ts`
- Mock React Router hooks: `useNavigate()`, `useLocation()`
- Mock React Query: `useQuery()`, `useMutation()`
- Mock toast notifications: "sonner" library
- Mock external libraries: Framer Motion animations (optional for unit tests)

**What to Mock:**
- Database operations (Supabase queries)
- API calls and external services
- Browser APIs (localStorage, window events)
- Toast/notification system
- Authentication context

**What NOT to Mock:**
- Component rendering logic
- State management (React hooks directly)
- Event handlers and user interactions
- Business logic utilities (calculate splits, balances, etc.)

**Recommended Mocking Approach:**
```typescript
// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));
```

## Fixtures and Factories

**Not Implemented:** No test fixtures or factory functions exist.

**When Testing is Implemented, Create:**
- Factory for `GroupMember` objects (used in `src/hooks/useGroups.tsx`)
- Factory for `Expense` objects (used in `src/hooks/useExpenses.tsx`)
- Factory for `Income` objects (used in `src/hooks/useIncomes.tsx`)
- Factory for `Profile` objects (used in `src/hooks/useAuth.tsx`)
- Sample API responses for common Supabase queries

**Proposed Location:** `src/__fixtures__/factories.ts` or similar

**Example fixture pattern:**
```typescript
export const createMockExpense = (overrides = {}): Expense => ({
  id: 'test-id',
  group_id: 'group-1',
  amount: 100,
  paid_by: 'user-1',
  category: 'food',
  description: 'Test expense',
  date: '2026-01-27',
  ...overrides
});

export const createMockGroupMember = (overrides = {}): GroupMember => ({
  user_id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});
```

## Coverage

**Requirements:** Not enforced (no testing framework in place)

**When Testing is Implemented, Recommend:**
- Minimum 70% coverage for critical paths
- 80%+ coverage for business logic (calculation functions, error handling)
- Utilities in `src/lib/` should be at 100%
- Focus on integration over unit test count

## Test Types

**Unit Tests:**
- Test individual utility functions (balance calculations, file parsing, error handling)
- Test form validation logic (in `AddExpenseModal`, `EditExpenseModal`, etc.)
- Location: `src/lib/*.test.ts`, `src/components/__tests__/`
- Scope: single function or component in isolation

**Integration Tests:**
- Test hooks with mocked Supabase (e.g., `useAuth()` flow, `useExpenses()` CRUD operations)
- Test modal flows: open > fill form > validate > submit > close
- Test state synchronization between hooks and components
- Location: `src/hooks/__tests__/`, `src/components/__tests__/`
- Scope: multiple units working together

**E2E Tests:**
- Not currently detected
- Would require Cypress, Playwright, or similar
- Should test user flows: login > add expense > view analytics > settle up
- **Recommendation:** Add E2E tests after unit/integration coverage in place

## Common Patterns

**Async Testing:**
- Not applicable (no tests yet)
- When implemented, use async/await syntax:

```typescript
it('should fetch user profile on auth', async () => {
  const { result } = renderHook(() => useAuth());

  await waitFor(() => {
    expect(result.current.profile).toBeDefined();
  });
});
```

**Error Testing:**
- Test error states in hooks and components
- Verify error messages displayed to users via toast
- Verify centralized error handler called correctly

**Example error test to implement:**
```typescript
it('should show error toast on validation failure', () => {
  // Test AddExpenseModal.validateForm() returns false
  // Verify toast.error() called with correct message

  const { getByRole } = render(<AddExpenseModal {...props} />);
  const submitButton = getByRole('button', { name: /submit/i });

  fireEvent.click(submitButton);

  expect(toast.error).toHaveBeenCalledWith('Ange ett belopp');
});
```

## Testing Priorities

**High Priority (Critical Business Logic):**
1. Balance calculation functions in `src/lib/balanceUtils.ts`
2. Error handling in `src/lib/errorHandling.ts`
3. Form validation in modals (`AddExpenseModal`, `EditExpenseModal`, etc.)
4. Authentication flow in `useAuth.tsx`
5. Expense and income CRUD operations in hooks

**Medium Priority (User Workflows):**
1. Adding/editing transactions (expenses, income)
2. Group management (create, invite, settle)
3. Savings projects (add, edit, track)
4. Offline functionality (React Query persistence)

**Low Priority (UI/Display):**
1. Component rendering and styling
2. Navigation and routing
3. Animation sequences

---

*Testing analysis: 2026-01-27*
