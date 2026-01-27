# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `AddExpenseModal.tsx`, `SideNav.tsx`, `Header.tsx`)
- Hook files: camelCase with "use" prefix (e.g., `useAuth.tsx`, `useExpenses.tsx`, `useGroups.tsx`)
- Utility files: camelCase (e.g., `errorHandling.ts`, `fileParser.ts`, `balanceUtils.ts`)
- UI component files: lowercase (e.g., `button.tsx`, `card.tsx`, `input.tsx`)
- Type/interface files: camelCase (e.g., `types.ts`)

**Functions and Components:**
- React components: PascalCase exported as functions (e.g., `export function AddExpenseModal()`)
- Utility functions: camelCase (e.g., `handleError()`, `cn()`)
- Event handlers: camelCase with verb prefix (e.g., `handleSplitChange()`, `validateForm()`)
- Custom hooks: camelCase with "use" prefix (e.g., `useAuth()`, `useExpenses()`)

**Variables and Constants:**
- State variables: camelCase (e.g., `amount`, `isOpen`, `customSplits`)
- Constants: camelCase or SCREAMING_SNAKE_CASE (e.g., `DEFAULT_CATEGORIES`, `MAX_ERROR_LOG_SIZE`)
- Type definitions: PascalCase (e.g., `ErrorContext`, `ProfileInterface`, `AddExpenseModalProps`)
- Enums: PascalCase with PascalCase members (e.g., `ErrorSeverity.INFO`, `ErrorCategory.AUTH`)

**Types and Interfaces:**
- Interface names: PascalCase with suffix "Interface" optional but typically omitted (e.g., `AuthContextType`, `ErrorContext`, `UserMetadata`)
- Props interfaces: PascalCase with "Props" suffix (e.g., `AddExpenseModalProps`)
- Enum names: PascalCase (e.g., `ErrorSeverity`, `ErrorCategory`)

## Code Style

**Formatting:**
- No explicit formatter configured in project (Prettier not set up)
- Follows standard React/TypeScript conventions
- Indentation: implicit from linting (2-space standard used across codebase)
- Line length: no enforced limit observed

**Linting:**
- Tool: ESLint 9.32.0 with TypeScript support
- Config: `eslint.config.js` (flat config format)
- Key plugins: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Key rules:
  - `react-refresh/only-export-components`: warns when non-component exports appear in .tsx files (allowConstantExport: true)
  - `@typescript-eslint/no-unused-vars`: disabled (set to "off")
  - `react-hooks/rules-of-hooks`: required (from plugin:react-hooks/recommended)
- TypeScript strict mode: **disabled** (`"strict": false`)
  - `noImplicitAny`: false
  - `strictNullChecks`: false
  - `noUnusedLocals`: false
  - `noUnusedParameters`: false

## Import Organization

**Order:**
1. React hooks and dependencies (e.g., `import { useState, useEffect } from "react"`)
2. External libraries (e.g., `import { motion, AnimatePresence } from "framer-motion"`)
3. UI components from project (e.g., `import { Button } from "@/components/ui/button"`)
4. Custom hooks (e.g., `import { useAuth } from "@/hooks/useAuth"`)
5. Types and utilities (e.g., `import { DEFAULT_CATEGORIES } from "@/lib/types"`)
6. Integration clients (e.g., `import { supabase } from "@/integrations/supabase/client"`)
7. Icons and assets (e.g., `import { Menu, X } from "lucide-react"`, `import logo from "@/assets/logo.png"`)

**Path Aliases:**
- `@/*` resolves to `./src/*` (defined in `tsconfig.json`)
- Used consistently for all imports from src directory

**Example import structure from `AddExpenseModal.tsx`:**
```typescript
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupMember } from "@/hooks/useGroups";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { ExpenseSplit } from "@/hooks/useExpenses";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DuplicateWarningDialog, PotentialDuplicate } from "./DuplicateWarningDialog";
import { Loader2 } from "lucide-react";
```

## Error Handling

**Patterns:**
- Centralized error handler: `handleError()` in `src/lib/errorHandling.ts`
- Category-specific handlers: `handleAuthError()`, `handleDatabaseError()`, `handleError()`
- Error severity levels: `ErrorSeverity.INFO`, `.WARNING`, `.ERROR`, `.CRITICAL`
- Error categories: `ErrorCategory.AUTH`, `.DATABASE`, `.NETWORK`, `.VALIDATION`, `.PERMISSION`, `.UNKNOWN`
- User feedback via toast notifications from "sonner" library
- Console logging with structured metadata

**Example error handling in `useAuth.tsx`:**
```typescript
const { data, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("user_id", sessionUser.id)
  .maybeSingle();

if (error) {
  handleDatabaseError(error, "Kunde inte hämta profil", {
    userId: sessionUser.id,
    retryCount
  });
  return;
}
```

**In-memory error logging:**
- Last 50 errors stored in memory (see `MAX_ERROR_LOG_SIZE = 50` in errorHandling.ts)
- Can be extended to Sentry or similar service in production
- Each error logged with: timestamp, category, severity, error object, metadata, user agent, URL

## Logging

**Framework:** Toast notifications via "sonner" library for user-facing messages; `console` for debug logging

**Patterns:**
- User errors/validation: `toast.error("message")`
- Success operations: `toast.success()` or implicit (no notification)
- Debug logging: `console.error()`, `console.warn()` via centralized error handler
- Log level selection: determined by `ErrorSeverity` enum value

**Example from `AddExpenseModal.tsx`:**
```typescript
if (!amount) {
  toast.error("Ange ett belopp");  // Toast for user feedback
  return false;
}

// Later, console logging handled by centralized error handler
console.error("Error checking duplicates:", error);
```

## Comments

**When to Comment:**
- Header comments for file purpose (e.g., `/** Centralized Error Handling Utility */`)
- Inline comments for non-obvious logic (e.g., "Cache data for 5 minutes", "Keep unused data in cache for 10 minutes")
- Comments explaining business logic or edge cases
- Avoid redundant comments that duplicate code

**JSDoc/TSDoc:**
- Used for utility functions: documented in `errorHandling.ts` with JSDoc (e.g., `* Main error handler - use this throughout the app for consistent error handling`)
- Component props: documented via TypeScript interfaces (e.g., `interface AddExpenseModalProps`)
- No strict JSDoc requirement across all functions

**Example from `App.tsx`:**
```typescript
// Clear React Query cache when user logs out to prevent stale data
useEffect(() => {
  if (!user) {
    // User logged out - clear all cached queries
    queryClientInstance.clear();
  }
}, [user, queryClientInstance]);
```

## Function Design

**Size:**
- Large components: 500-900 lines common (e.g., `Settings.tsx` is 886 lines)
- Medium components: 300-450 lines typical for modal/page components
- Small utility functions: 5-50 lines
- No strict line-length limits enforced

**Parameters:**
- Destructured from object/interface (e.g., `({ isOpen, onClose, onAdd, groupId, members }`)
- Props passed as single interface object to avoid prop drilling
- Hooks used for accessing global state (useAuth, useGroups, etc.)

**Return Values:**
- Components: JSX elements
- Hooks: object with state and methods (e.g., `{ user, session, profile, loading, signUp, signIn }`)
- Event handlers: void or promise-based for async operations
- Utilities: typed returns matching function purpose

**Example function signature:**
```typescript
export function AddExpenseModal({ isOpen, onClose, onAdd, groupId, members }: AddExpenseModalProps) {
  // Component body
}

const handleSplitChange = (userId: string, value: string) => {
  setCustomSplits((prev) => ({
    ...prev,
    [userId]: value,
  }));
};
```

## Module Design

**Exports:**
- Named exports for components and utilities: `export function ComponentName()`, `export function utilityFunction()`
- Default exports for pages (e.g., `export default App` in App.tsx, `export default Settings` in Settings.tsx)
- Barrel file detected: `src/components/analytics/index.ts`

**Barrel Files:**
- Minimal usage; single barrel file found in `src/components/analytics/index.ts`
- Prefer direct imports from individual files otherwise

**File Structure Pattern:**
- Each component/hook typically in its own file
- Related utilities grouped in lib directories (e.g., `src/lib/errorHandling.ts`, `src/lib/balanceUtils.ts`)
- UI components in dedicated `src/components/ui/` directory (shadcn/ui components)
- Feature components in `src/components/` root

---

*Convention analysis: 2026-01-27*
