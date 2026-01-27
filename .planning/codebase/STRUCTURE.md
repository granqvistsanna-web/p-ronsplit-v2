# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
p-ronsplit-v2/
├── src/                       # Source code root
│   ├── App.tsx               # Root app component with routing and providers
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global Tailwind/CSS styles
│   ├── vite-env.d.ts         # Vite environment type definitions
│   │
│   ├── pages/                # Page-level components (routed)
│   │   ├── Index.tsx         # Dashboard - main expense/income overview
│   │   ├── Aktivitet.tsx     # Activity - transaction history timeline
│   │   ├── Analys.tsx        # Analytics - charts, trends, comparisons
│   │   ├── Sparande.tsx      # Savings - savings goals and contributions
│   │   ├── Settings.tsx      # Settings - user profile, group management
│   │   ├── Auth.tsx          # Login/signup forms
│   │   ├── Landing.tsx       # Public landing page
│   │   ├── VerifyEmail.tsx   # Email verification page
│   │   ├── ResetPassword.tsx # Password reset flow
│   │   └── NotFound.tsx      # 404 page
│   │
│   ├── components/           # Reusable components
│   │   ├── ui/              # Shadcn/UI library components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── ... (20+ more UI components)
│   │   │
│   │   ├── analytics/       # Chart components
│   │   │   ├── CategoryDonut.tsx    # Pie chart of expenses by category
│   │   │   ├── ComparisonBar.tsx    # Bar chart for period comparison
│   │   │   ├── TrendChart.tsx       # Line chart for trends over time
│   │   │   └── index.ts             # Barrel export
│   │   │
│   │   ├── AddExpenseModal.tsx       # Modal for adding expense
│   │   ├── AddIncomeModal.tsx        # Modal for adding income
│   │   ├── AddContributionModal.tsx  # Modal for savings contributions
│   │   ├── AddMembersModal.tsx       # Modal for adding group members
│   │   ├── AddProjectModal.tsx       # Modal for adding savings project
│   │   ├── AddTransactionModal.tsx   # Wrapper modal for expense/income choice
│   │   │
│   │   ├── EditExpenseModal.tsx      # Modal for editing expense
│   │   ├── EditIncomeModal.tsx       # Modal for editing income
│   │   ├── EditSettlementModal.tsx   # Modal for editing settlement
│   │   ├── EditProjectModal.tsx      # Modal for editing savings project
│   │   │
│   │   ├── ImportModal.tsx           # Modal for CSV/Excel import
│   │   ├── DuplicateWarningDialog.tsx # Dialog for import duplicates
│   │   ├── SwishModal.tsx            # Swish payment info display
│   │   ├── SettlementModal.tsx       # Modal for settling debts
│   │   │
│   │   ├── BalanceCard.tsx           # Displays member balance summary
│   │   ├── MemberSummaryCard.tsx     # Detailed member breakdown
│   │   ├── IncomeOverviewCard.tsx    # Income summary widget
│   │   ├── SavingsProjectCard.tsx    # Savings goal progress card
│   │   │
│   │   ├── ExpenseItem.tsx           # List item for expense
│   │   ├── IncomeItem.tsx            # List item for income
│   │   ├── SettlementItem.tsx        # List item for settlement
│   │   ├── SettlementHistory.tsx     # List of past settlements
│   │   ├── SavingsContributionList.tsx # List of contributions
│   │   │
│   │   ├── GroupSelector.tsx         # Dropdown to select household
│   │   ├── MonthSelector.tsx         # Navigation for month/year
│   │   ├── AddFab.tsx                # Floating action button
│   │   ├── Header.tsx                # Page header with title
│   │   ├── HeaderMenu.tsx            # Header dropdown menu
│   │   ├── SideNav.tsx               # Left sidebar navigation
│   │   ├── NavLink.tsx               # Navigation link component
│   │   │
│   │   ├── ProtectedRoute.tsx        # Route wrapper requiring auth
│   │   ├── PublicRoute.tsx           # Route wrapper for public pages
│   │   ├── OfflineIndicator.tsx      # Shows connection status
│   │   ├── PasswordStrengthIndicator.tsx # Password quality meter
│   │   ├── PullToRefresh.tsx         # Mobile pull-to-refresh gesture
│   │   └── RecurringSection.tsx      # UI for recurring transactions
│   │
│   ├── hooks/                # React hooks for state and logic
│   │   ├── useAuth.tsx       # Auth state provider and hook
│   │   ├── useTheme.tsx      # Theme (dark/light) provider and hook
│   │   ├── useMonthSelection.tsx # Month navigation provider and hook
│   │   │
│   │   ├── useGroups.tsx     # Groups/households data and mutations
│   │   ├── useExpenses.tsx   # Expenses data and CRUD operations
│   │   ├── useIncomes.tsx    # Incomes data and CRUD operations
│   │   ├── useSettlements.tsx # Settlements data and CRUD operations
│   │   ├── useSavingsProjects.tsx # Savings projects data and CRUD
│   │   ├── useAllUsers.tsx   # Fetch all users (public profiles)
│   │   │
│   │   ├── useOnlineStatus.tsx # Network connection detection
│   │   ├── useCountAnimation.tsx # Number animation utility
│   │   ├── useSidebar.tsx    # Sidebar state management
│   │   ├── use-mobile.tsx    # Mobile breakpoint detection
│   │   └── use-toast.ts      # Toast notification hook
│   │
│   ├── lib/                  # Utilities and helpers
│   │   ├── types.ts          # Core domain types (Expense, Income, Group, etc)
│   │   ├── balanceUtils.ts   # Financial calculations for balance
│   │   ├── incomeUtils.ts    # Income calculation helpers
│   │   ├── errorHandling.ts  # Centralized error handling system
│   │   ├── fileParser.ts     # CSV/Excel file parsing for imports
│   │   └── utils.ts          # General utilities (className helpers)
│   │
│   ├── integrations/         # External service integrations
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client initialization
│   │       └── types.ts      # Auto-generated Supabase database types
│   │
│   └── assets/               # Static assets
│       └── (images, icons, etc)
│
├── public/                    # Public static files
│   └── (favicon, manifest, etc)
│
├── dist/                     # Built output (generated)
├── node_modules/             # Dependencies (generated)
│
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # App TypeScript configuration
├── tsconfig.node.json       # Build tool TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint configuration
├── components.json          # shadcn/ui CLI configuration
│
├── supabase/                # Supabase migrations and config
│   └── migrations/          # SQL migrations
│
└── .planning/               # GSD planning documents
    └── codebase/
```

## Directory Purposes

**src/pages/**
- Purpose: Route-level page components that represent different screens
- Contains: Full page layouts with multiple sub-components
- Key files: `Index.tsx` (most complex), `Analys.tsx` (charts), `Settings.tsx` (largest)
- Naming: PascalCase, English names (Index, Aktivitet, Sparande)

**src/components/**
- Purpose: Reusable UI components and modals
- Contains: Modals for CRUD operations, display cards, list items, navigation
- Organization: `ui/` subdirectory contains shadcn library, domain components at root
- Naming: PascalCase component names matching functionality

**src/components/analytics/**
- Purpose: Dedicated chart visualization components
- Contains: Recharts-based graphs for expense analysis
- Usage: Imported by Analys page

**src/hooks/**
- Purpose: Custom React hooks for state management and data fetching
- Contains: Context providers, Supabase data hooks, utility hooks
- Pattern: Hook names start with `use`, context provider inline in hook
- Types: Define interfaces at top of each hook file

**src/lib/**
- Purpose: Shared business logic, utilities, and type definitions
- Contains: Calculation functions, error handlers, file parsers
- Key file: `balanceUtils.ts` - complex financial calculations
- Usage: Imported by hooks and components as needed

**src/integrations/supabase/**
- Purpose: Backend integration and database communication
- Contains: Supabase client instance, auto-generated database types
- Critical: `client.ts` is singleton source of truth for Supabase
- Note: `types.ts` is auto-generated by Supabase CLI

**public/**
- Purpose: Static assets served at root level
- Contains: favicon, robots.txt, manifest.json, etc

**dist/**
- Purpose: Compiled production build output
- Contains: Bundled JavaScript, CSS, HTML
- Generated: By `npm run build`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app initialization
- `src/App.tsx`: Root component with providers and routing
- `index.html`: HTML document loaded by browser

**Configuration:**
- `package.json`: Dependencies, scripts, project metadata
- `vite.config.ts`: Vite bundler configuration with @ alias
- `tailwind.config.ts`: Tailwind CSS theme customization
- `tsconfig.json`: TypeScript compiler settings
- `eslint.config.js`: Code linting rules

**Core Logic:**
- `src/App.tsx`: Routing, provider setup
- `src/hooks/useAuth.tsx`: Authentication state management
- `src/hooks/useGroups.tsx`: Group/household management
- `src/hooks/useExpenses.tsx`: Expense CRUD and logic
- `src/lib/balanceUtils.ts`: Financial calculations
- `src/lib/errorHandling.ts`: Error categorization and logging

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `AddExpenseModal.tsx`)
- Hooks: `use[Name].tsx` (e.g., `useExpenses.tsx`)
- Utilities: `camelCase.ts` (e.g., `balanceUtils.ts`)
- Types: Inline in same file as usage, or exported from `lib/types.ts`

**Directories:**
- Feature directories: `camelCase` (e.g., `components`, `hooks`, `pages`)
- Specialized subdirs: `camelCase` (e.g., `analytics`, `ui`, `supabase`)

**Variables & Functions:**
- Variables: `camelCase` (e.g., `selectedMonth`, `isLoading`)
- Functions: `camelCase` (e.g., `fetchExpenses()`, `calculateBalance()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_CATEGORIES`)
- React Hooks in context: `use[Name]` (e.g., `useExpenses()`)

**Types & Interfaces:**
- Interfaces: `PascalCase` (e.g., `Expense`, `Group`, `BalanceBreakdown`)
- Enums: `PascalCase` (e.g., `ErrorSeverity`, `ErrorCategory`)
- Generic types: `T`, `K`, `V` convention

## Where to Add New Code

**New Feature (Complete Domain):**
- Create new hook: `src/hooks/use[Feature].tsx`
  - Define types/interfaces at top
  - Create context provider if global state needed
  - Implement CRUD methods
  - Export hook and provider
- Create page: `src/pages/[Feature].tsx`
  - Import and use hook
  - Compose with existing components
- Create modals/components: `src/components/[Feature]Modal.tsx`, `src/components/[Feature]Card.tsx`
  - Use form components from `src/components/ui/`
  - Call hook methods on submit
- Add route: In `src/App.tsx` Routes section

**New Component/Modal:**
- Location: `src/components/[Name].tsx` (or subdirectory if grouped)
- Pattern: Functional component with props typed, uses hooks as needed
- Style: Tailwind classes, shadcn/ui primitives
- Modals: Extend dialog/drawer from `src/components/ui/`, wrap forms

**New Utility Function:**
- Location: `src/lib/[purpose]Utils.ts` or existing utility file
- Pattern: Pure function, typed parameters and return, no side effects
- Usage: Import and call from components/hooks

**New Hook:**
- Location: `src/hooks/use[Name].tsx`
- Pattern: Custom hook with state, effects, memoized return value
- Types: Define interfaces in hook file
- Provider: If global state needed, include provider in same file

**New Page:**
- Location: `src/pages/[Name].tsx`
- Pattern: Full page component with useAuth guard, use domain hooks
- Route: Add to Routes in `src/App.tsx`
- Protection: Wrap with `<ProtectedRoute>` if authenticated only

## Special Directories

**src/components/ui/:**
- Purpose: shadcn/ui component library
- Generated: By shadcn CLI, don't edit directly
- Committed: Yes, to version control
- When to import: Use in pages and custom components

**dist/:**
- Purpose: Production build output
- Generated: By `npm run build`
- Committed: No, in .gitignore
- When to use: Generated for deployment

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: By `npm install`
- Committed: No, in .gitignore
- When to use: Development and production runtime

**supabase/migrations/:**
- Purpose: Database schema version control
- Generated: By Supabase CLI
- Committed: Yes, to version control
- When to edit: After creating migrations with `supabase migration new`

---

*Structure analysis: 2026-01-27*
