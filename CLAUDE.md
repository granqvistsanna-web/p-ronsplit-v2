# Päronsplit - Project Context for Claude

## Project Overview
Päronsplit is an expense and income splitting application built for managing shared finances between multiple people. Users can track expenses, income, settlements, and view analysis of their financial splits.

## Tech Stack

### Frontend
- **Build Tool**: Vite 7.x
- **Framework**: React 18.3 with TypeScript 5.8
- **UI Library**: shadcn-ui (with Radix UI primitives)
- **Styling**: Tailwind CSS 3.4 with custom theme
- **Routing**: React Router 6.30
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend & Data
- **Backend**: Supabase (authentication + database)
- **State Management**: TanStack React Query v5 with local persistence
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns 3.6
- **Excel Export**: ExcelJS 4.4

### Offline-First Architecture
- React Query configured for offline-first operations
- Cache persistence via localStorage
- Automatic retry logic with exponential backoff
- Network status monitoring with visual indicator

## Project Structure

```
src/
├── pages/          # Route pages (Landing, Auth, Index, Analys, Aktivitet, Settings)
├── components/     # React components
│   ├── ui/        # shadcn-ui components (Button, Card, Dialog, etc.)
│   └── ...        # Feature components (ExpenseItem, IncomeItem, etc.)
├── hooks/          # Custom React hooks (useAuth, useTheme, useMonthSelection)
├── lib/            # Utilities and types
│   ├── types.ts   # TypeScript type definitions
│   ├── utils.ts   # General utilities
│   ├── fileParser.ts
│   ├── incomeUtils.ts
│   └── balanceUtils.ts
└── index.css       # Global styles and CSS variables
```

## TypeScript Configuration

### Path Aliases
- `@/*` maps to `./src/*`
- Always use path aliases for imports: `import { Button } from "@/components/ui/button"`

### Relaxed Settings (Intentional)
- `noImplicitAny: false` - Implicit any is allowed
- `strictNullChecks: false` - Null checks not enforced
- `noUnusedLocals: false` - Unused variables allowed
- `noUnusedParameters: false` - Unused params allowed
- These are project conventions - don't suggest making them stricter

## Styling & Theme

### Custom Tailwind Theme
- Uses HSL CSS variables for all colors (defined in index.css)
- Custom font families: Geist Sans and Geist Mono
- Semantic colors for income/expense tracking
- Custom animations: fade-in, scale-in, slide-up, pulse-soft, etc.
- Container max-width set to 640px (mobile-first design)

### Color Conventions
- Use semantic colors: `income` (mint green) and `expense` (red/pink) for financial displays
- Icon colors: Notion-inspired pastels (blue, purple, pink, mint) with matching backgrounds
- Dark mode supported via `class` strategy

## Code Conventions

### Component Patterns
- Functional components with hooks (no class components)
- Export components as default from page files
- Named exports for utility components
- Modal/Dialog components named with "Modal" or "Dialog" suffix

### State Management
- Use React Query for server state (data from Supabase)
- Context providers for app-wide state (Auth, Theme, MonthSelection)
- Local component state with `useState` for UI-only state

### File Organization
- One component per file
- Co-locate related utilities with components when appropriate
- Keep UI components in `components/ui/` - don't modify unless updating shadcn
- Custom components in `components/` root

## Common Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Supabase
The project uses Supabase for authentication and database. Connection details are in environment variables.

## Important Context

### Language
- UI is in Swedish (pages: Analys, Aktivitet, Inställningar)
- Keep Swedish naming conventions for user-facing features
- Code comments and variable names can be in English

### Authentication Flow
- Public routes: Landing (`/`) and Auth (`/auth`)
- Protected routes: Dashboard, Analys, Aktivitet, Settings
- `ProtectedRoute` component handles auth guards
- Auth context provides user state across app

### React Query Setup
- 5-minute stale time
- 10-minute garbage collection
- Automatic retry (3 attempts) with exponential backoff
- Offline-first network mode
- Cache cleared on logout

### Key Features to Remember
- Multi-person expense splitting
- Income tracking
- Settlement history and tracking
- Monthly view with month selector
- Excel import/export functionality
- Swish integration for payments (Swedish mobile payment)
- Recurring expenses/income support
- Pull-to-refresh on mobile
- Balance calculations between members

## Git Workflow Preferences

### Commit Messages
- Clear, descriptive messages
- Start with imperative verb (Add, Fix, Update, Implement, etc.)
- Reference specific features or components
- Examples from history:
  - "Implement TODO: Update document title and meta tags to Päronsplit"
  - "Fix group creation errors"
  - "Fix critical security vulnerabilities in dependencies"

### Branching
- Work on feature branches: `claude/feature-name-xxxxx`
- Always push to branch with: `git push -u origin <branch-name>`
- Create PRs for merging to main

### Security Focus
- Run dependency audits regularly
- Fix security vulnerabilities promptly
- Be cautious with user input validation
- Sanitize data before database operations

## Things to Remember

### Don't Do
- Don't add strict TypeScript settings - the project intentionally uses relaxed mode
- Don't modify shadcn-ui components in `components/ui/` unless updating the library
- Don't skip offline-first patterns when adding new data operations
- Don't forget to clear React Query cache on logout for new auth features
- Don't use English for user-facing text - keep Swedish UI language

### Do
- Use the custom theme colors (income/expense semantic colors)
- Implement proper loading states (the app has offline support)
- Add proper error handling with React Query
- Use the established modal patterns (AddExpenseModal, EditExpenseModal, etc.)
- Test offline functionality for new features
- Follow the existing form validation pattern (React Hook Form + Zod)
- Use the centralized utilities in `lib/` for common operations

## Environment & Deployment

### Environment Variables
The application requires the following environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/publishable key

**Setup:**
```bash
# Copy the example file
cp .env.example .env

# The .env file is already configured with the project values
# For production, ensure these are set in your deployment platform
```

### Database Setup
Before deploying, ensure the Supabase database is properly configured:
- See `SUPABASE_DATABASE_SETUP.md` for complete database schema and trigger setup
- **Critical:** The `handle_new_user()` trigger must be set up to auto-create profiles
- See `SUPABASE_EDGE_FUNCTION_SETUP.md` for the account deletion Edge Function

### Deployment
- Built via Lovable platform
- Can be deployed via Lovable's sharing/publish feature
- Development server runs on Vite (typically port 5173)
- Production builds optimized with Vite's production settings
- **Important:** Ensure environment variables are configured in your deployment platform

---

Remember: This is a financial management app handling sensitive user data. Always prioritize security, data integrity, and offline reliability.
