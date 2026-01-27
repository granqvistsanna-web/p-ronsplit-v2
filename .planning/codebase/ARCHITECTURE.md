# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Context-Based State Management with Hooks + Supabase Backend

The application uses React Context API combined with custom hooks for state management, paired with Supabase as the backend for authentication and real-time data. Each domain (groups, expenses, incomes, settlements) has its own context-backed custom hook that handles data fetching, mutations, and local state.

**Key Characteristics:**
- Context providers wrap the app for global state (Auth, Theme, Month Selection)
- Custom hooks encapsulate domain-specific logic (expenses, incomes, groups, settlements)
- Supabase client handles all backend communication and real-time updates
- React Router manages navigation between pages and protected routes
- React Query (TanStack Query) persists and caches query data to localStorage
- Component-based UI with shadcn/ui providing pre-built components

## Layers

**Presentation Layer (Pages & Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/pages/`, `src/components/`
- Contains: Page components (Index, Analys, Aktivitet, Sparande, Settings, Auth, Landing), modal dialogs, cards, lists
- Depends on: Custom hooks for data, UI components, routing
- Used by: React Router, BrowserRouter

**State Management Layer (Hooks & Context):**
- Purpose: Manage application state and domain logic
- Location: `src/hooks/`
- Contains:
  - Context providers: `useAuth`, `useTheme`, `useMonthSelection`
  - Data hooks: `useGroups`, `useExpenses`, `useIncomes`, `useSettlements`, `useSavingsProjects`
  - Utility hooks: `useOnlineStatus`, `useCountAnimation`, `useAllUsers`, `useSidebar`
- Depends on: Supabase client, error handling utilities
- Used by: All pages and components

**Integration Layer (Supabase):**
- Purpose: Backend API, authentication, real-time database
- Location: `src/integrations/supabase/`
- Contains: Supabase client configuration, TypeScript types for database schema
- Depends on: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Used by: All hooks via `supabase` client instance

**Utility Layer (Libs):**
- Purpose: Shared business logic and helper functions
- Location: `src/lib/`
- Contains:
  - `balanceUtils.ts`: Balance calculation logic for splitting expenses
  - `errorHandling.ts`: Centralized error handling with severity levels
  - `incomeUtils.ts`: Income calculation utilities
  - `fileParser.ts`: CSV/Excel file parsing for expense imports
  - `types.ts`: Core domain types (Expense, Settlement, Group, User, Category)
  - `utils.ts`: General utilities

**UI Component Library:**
- Purpose: Reusable Radix UI + shadcn/ui components
- Location: `src/components/ui/`
- Contains: Buttons, modals, forms, cards, selectors, charts
- Used by: All pages and custom components

**Domain-Specific Components:**
- Purpose: Feature-specific UI components
- Location: `src/components/` (excluding `ui/`)
- Examples: `AddExpenseModal`, `BalanceCard`, `SettlementModal`, `SavingsProjectCard`

## Data Flow

**Initialization Flow:**
1. `main.tsx` → Creates React root
2. `App.tsx` → Wraps with providers (QueryClient, Auth, Theme, MonthSelection)
3. `App.tsx` → `AppContent` component initializes routing
4. `AuthProvider` (useAuth hook) → Checks session on mount, fetches user profile
5. User redirected to Landing or Dashboard based on auth state

**Data Fetch Flow (Example: Expenses):**
1. Page component (e.g., `Index.tsx`) calls `useExpenses(groupId)`
2. Hook mounts → `fetchExpenses()` called via `useEffect`
3. Hook calls `supabase.from("expenses").select(...)`
4. Data normalized (splits parsed from JSON)
5. State set → component re-renders
6. React Query caches result for 5 minutes (staleTime)
7. Data persisted to localStorage via PersistQueryClientProvider

**Mutation Flow (Example: Add Expense):**
1. Component calls `addExpense({ group_id, amount, paid_by, category, date, splits })`
2. Hook validates user is authenticated
3. Hook serializes splits to JSON string
4. Hook inserts to `supabase.from("expenses").insert(...)`
5. On success: refetches all expenses via `fetchExpenses()`, shows success toast
6. On error: shows error toast, logs to console
7. UI updates automatically when state changes

**Authentication State Flow:**
1. User lands on app → `AuthProvider.useEffect` calls `supabase.auth.getSession()`
2. If session exists: Sets user, session, fetches profile
3. Sets up `onAuthStateChange` listener for auth events
4. On login/signup: listener triggers, profile auto-fetched
5. On logout: listener clears user, session, profile
6. App.tsx `useEffect` watches user state → clears React Query cache on logout

**Month Selection Flow:**
1. `MonthSelectionProvider` wraps app at high level
2. Components call `useMonthSelection()` to get current month/year
3. Month navigation (prev/next) updates context state
4. Components filter data by selected month in `useMemo`
5. Change bubbles through filter to UI

**State Management:**
- Global state: User auth, theme, month selection
- Scoped state: Expenses, incomes, groups per household
- UI state: Modal open/close, editing entity, loading states
- Cache: React Query manages with 5min staleTime, localStorage persistence
- Side effects: Refetch on mount, refetch on window focus, retry on reconnect

## Key Abstractions

**Custom Hooks Pattern:**
- Purpose: Encapsulate domain logic and data fetching
- Examples: `useExpenses`, `useGroups`, `useAuth`
- Pattern: Hook maintains local state, provides fetch + CRUD methods, memoizes return value
- File: `src/hooks/use*.tsx`

**Context Provider Pattern:**
- Purpose: Provide global state without prop drilling
- Examples: `AuthProvider`, `ThemeProvider`, `MonthSelectionProvider`
- Pattern: `createContext` → Provider component with state → `useContext` hook
- File: In hook files like `src/hooks/useAuth.tsx`

**Supabase Client Wrapper:**
- Purpose: Single source of truth for backend communication
- File: `src/integrations/supabase/client.ts`
- Pattern: Exports singleton `supabase` client configured with env vars
- Usage: Imported and used in all hooks

**Type System:**
- Purpose: Runtime-safe data handling
- Core types: `Expense`, `Income`, `Settlement`, `Group`, `User`, `Category`
- Database types: Auto-generated in `src/integrations/supabase/types.ts`
- File: `src/lib/types.ts`

**Error Handling System:**
- Purpose: Centralized, categorized error handling
- Location: `src/lib/errorHandling.ts`
- Categories: AUTH, DATABASE, NETWORK, VALIDATION, PERMISSION, UNKNOWN
- Severity levels: INFO, WARNING, ERROR, CRITICAL
- Usage: `handleError()`, `handleAuthError()`, `handleDatabaseError()`

**Balance Calculation Engine:**
- Purpose: Complex financial calculations for expense splitting
- File: `src/lib/balanceUtils.ts`
- Logic: Calculates net income vs expenses per member, determines who owes whom
- Usage: Called by `Index.tsx` and `Analys.tsx` to display balance cards

## Entry Points

**Web Entry Point:**
- Location: `src/main.tsx`
- Triggers: HTML loads `index.html` which references `main.tsx`
- Responsibilities: Creates React root, renders App component

**App Entry Point:**
- Location: `src/App.tsx`
- Triggers: Loaded by main.tsx
- Responsibilities: Wraps entire app with providers, sets up routing, initializes auth

**Page Entry Points:**
- Dashboard/Index: `src/pages/Index.tsx` → Expense overview, quick actions
- Activity: `src/pages/Aktivitet.tsx` → Transaction history
- Analytics: `src/pages/Analys.tsx` → Charts, trends, comparisons
- Savings: `src/pages/Sparande.tsx` → Savings goals management
- Settings: `src/pages/Settings.tsx` → User preferences, group management
- Auth: `src/pages/Auth.tsx` → Login/signup form
- Landing: `src/pages/Landing.tsx` → Public landing page

**Protected Route Entry:**
- Component: `src/components/ProtectedRoute.tsx`
- Triggers: When user navigates to protected path
- Responsibilities: Checks auth state, redirects to login if needed

## Error Handling

**Strategy:** Hierarchical error handling with categorization and severity levels

**Patterns:**

1. **Try-Catch in Hooks:**
   - Async operations in custom hooks wrapped in try-catch
   - Catches and logs to console with error details
   - Shows user-friendly toast message
   - Returns null or empty array on failure

2. **Specific Error Handlers:**
   ```typescript
   handleAuthError(error, message, metadata)     // Auth-specific
   handleDatabaseError(error, message, metadata) // Database-specific
   handleError(error, context)                   // Generic handler
   ```

3. **Error Log Storage:**
   - In-memory log in `errorHandling.ts` stores last 50 errors
   - Can be extended to send to external service (Sentry, etc.)

4. **Toast Notifications:**
   - Errors show to user via sonner toast
   - Success messages on successful operations
   - Can be disabled per-error with `showToast: false`

5. **Network Error Resilience:**
   - React Query configured with `networkMode: "offlineFirst"`
   - Failed mutations retried up to 3 times with exponential backoff
   - Offline data served from cache

## Cross-Cutting Concerns

**Logging:**
- Console.log/console.error in hooks and utility functions
- Error timestamps and categorization in `errorHandling.ts`
- No centralized logging service connected yet

**Validation:**
- Type checking via TypeScript
- Form validation via react-hook-form in modal components
- Database constraints enforced at Supabase level

**Authentication:**
- Supabase Auth handles email/password signup and login
- Session persisted to localStorage via Supabase client config
- Session validated on app mount and on auth state changes
- Protected routes check `user` from `useAuth()` context

**Offline Support:**
- React Query caches all data to localStorage
- Mutations queued offline via React Query's networkMode setting
- OfflineIndicator component shows connection status
- Refetch triggered on reconnect

**Accessibility:**
- Radix UI components provide semantic HTML
- shadcn/ui components include ARIA attributes
- Keyboard navigation supported via Radix primitives

---

*Architecture analysis: 2026-01-27*
