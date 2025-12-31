# Centralized Error Handling Guide

**Date:** 2025-12-31
**Project:** Päronsplit
**Scope:** Application-wide error handling strategy

---

## 📋 Overview

Päronsplit uses a centralized error handling system to ensure consistent error logging, user feedback, and monitoring across the application. This guide explains how to use the error handling utilities effectively.

---

## 🎯 Key Features

✅ **Consistent Error Logging** - All errors logged with structured format
✅ **User-Friendly Messages** - Automatic toast notifications with Swedish translations
✅ **Error Categorization** - Errors grouped by type (auth, database, network, etc.)
✅ **Severity Levels** - INFO, WARNING, ERROR, CRITICAL
✅ **In-Memory Log** - Last 50 errors stored for debugging
✅ **Extensible** - Ready for Sentry/LogRocket integration

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { handleError, ErrorCategory, ErrorSeverity } from "@/lib/errorHandling";

try {
  // Your code here
} catch (error) {
  handleError(error, {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.ERROR,
    userMessage: "Kunde inte spara data",
    metadata: { userId: user.id }
  });
}
```

### Specialized Handlers

For common scenarios, use the specialized handlers:

```typescript
import {
  handleAuthError,
  handleDatabaseError,
  handleNetworkError,
  handleValidationError
} from "@/lib/errorHandling";

// Authentication errors
try {
  await signIn(email, password);
} catch (error) {
  handleAuthError(error, "Inloggningen misslyckades", { email });
}

// Database errors
try {
  await supabase.from('expenses').insert(data);
} catch (error) {
  handleDatabaseError(error, "Kunde inte spara utgift");
}

// Network errors
try {
  await fetch('/api/data');
} catch (error) {
  handleNetworkError(error, "Nätverksfel uppstod");
}

// Validation errors
if (!isValid) {
  handleValidationError(
    new Error("Invalid input"),
    "Kontrollera dina uppgifter"
  );
}
```

---

## 📚 API Reference

### Error Categories

```typescript
enum ErrorCategory {
  AUTH = 'auth',           // Authentication/authorization errors
  DATABASE = 'database',   // Database operations
  NETWORK = 'network',     // Network/connectivity issues
  VALIDATION = 'validation', // User input validation
  PERMISSION = 'permission', // Permission denied
  UNKNOWN = 'unknown'      // Uncategorized errors
}
```

### Error Severity

```typescript
enum ErrorSeverity {
  INFO = 'info',           // Informational only
  WARNING = 'warning',     // Warning, non-critical
  ERROR = 'error',         // Error, needs attention
  CRITICAL = 'critical'    // Critical, immediate action required
}
```

### Error Context

```typescript
interface ErrorContext {
  category: ErrorCategory;        // Required: Error category
  severity: ErrorSeverity;        // Required: Severity level
  userMessage?: string;           // Optional: User-facing message
  metadata?: Record<string, unknown>; // Optional: Additional context
  showToast?: boolean;            // Optional: Show toast (default: true)
  logToConsole?: boolean;         // Optional: Console log (default: true)
}
```

---

## 🛠️ Functions

### Main Handler

**`handleError(error, context)`**

The primary error handler. Use this for full control over error handling.

```typescript
handleError(error, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.CRITICAL,
  userMessage: "Kritiskt databasfel",
  metadata: {
    table: 'expenses',
    operation: 'insert'
  },
  showToast: true,
  logToConsole: true
});
```

### Specialized Handlers

**`handleAuthError(error, userMessage?, metadata?)`**

For authentication and authorization errors.

```typescript
handleAuthError(error, "Sessionen har gått ut");
```

**`handleDatabaseError(error, userMessage?, metadata?)`**

For database operation errors.

```typescript
handleDatabaseError(error, "Kunde inte hämta data", {
  query: 'expenses'
});
```

**`handleNetworkError(error, userMessage?, metadata?)`**

For network connectivity issues.

```typescript
handleNetworkError(error, "Ingen internetanslutning");
```

**`handleValidationError(error, userMessage?, metadata?)`**

For input validation errors.

```typescript
handleValidationError(error, "E-postadressen är ogiltig");
```

---

## 📊 Monitoring & Debugging

### Get Error Log

```typescript
import { getErrorLog } from "@/lib/errorHandling";

const errors = getErrorLog();
console.log(`Total errors: ${errors.length}`);
```

### Get Error Statistics

```typescript
import { getErrorStats } from "@/lib/errorHandling";

const stats = getErrorStats();
console.log(`Total: ${stats.total}`);
console.log(`Auth errors: ${stats.byCategory.auth}`);
console.log(`Critical errors: ${stats.bySeverity.critical}`);
```

### Export Error Log

```typescript
import { exportErrorLog } from "@/lib/errorHandling";

// Export as JSON for support/debugging
const jsonLog = exportErrorLog();
console.log(jsonLog);

// Or download as file
const blob = new Blob([jsonLog], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Create download link...
```

### Check for Recent Critical Errors

```typescript
import { hasRecentCriticalErrors } from "@/lib/errorHandling";

// Check last 60 seconds (default)
if (hasRecentCriticalErrors()) {
  console.warn("Critical errors detected!");
}

// Check last 5 minutes
if (hasRecentCriticalErrors(5 * 60 * 1000)) {
  console.warn("Critical errors in last 5 minutes!");
}
```

### Clear Error Log

```typescript
import { clearErrorLog } from "@/lib/errorHandling";

clearErrorLog();
```

---

## 🎨 User Messages

### Default Messages (Swedish)

The system provides default Swedish messages for each category:

- **AUTH**: "Ett autentiseringsfel uppstod. Försök igen eller logga in på nytt."
- **DATABASE**: "Ett databasfel uppstod. Försök igen om en stund."
- **NETWORK**: "Nätverksfel. Kontrollera din internetanslutning."
- **VALIDATION**: "Felaktig inmatning. Kontrollera dina uppgifter."
- **PERMISSION**: "Du har inte behörighet för denna åtgärd."
- **UNKNOWN**: "Ett oväntat fel uppstod. Försök igen."

### Custom Messages

Always prefer custom, context-specific messages:

```typescript
// ❌ Bad - uses default message
handleAuthError(error);

// ✅ Good - custom, specific message
handleAuthError(error, "Lösenordet är felaktigt. Försök igen.");
```

---

## 💡 Best Practices

### 1. Always Provide Context

```typescript
// ❌ Bad
handleError(error, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.ERROR
});

// ✅ Good
handleError(error, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.ERROR,
  userMessage: "Kunde inte spara utgift",
  metadata: {
    expenseId: expense.id,
    userId: user.id,
    operation: 'create'
  }
});
```

### 2. Use Appropriate Severity

```typescript
// INFO - For informational messages
handleError(info, {
  category: ErrorCategory.AUTH,
  severity: ErrorSeverity.INFO,
  userMessage: "Sessionen förnyas automatiskt"
});

// WARNING - For non-critical issues
handleError(warning, {
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.WARNING,
  userMessage: "Datumet ligger i framtiden"
});

// ERROR - For standard errors
handleError(error, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.ERROR,
  userMessage: "Kunde inte spara data"
});

// CRITICAL - For critical failures
handleError(critical, {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.CRITICAL,
  userMessage: "Databasanslutningen misslyckades"
});
```

### 3. Include Metadata

```typescript
handleDatabaseError(error, "Kunde inte hämta profil", {
  userId: user.id,
  retryCount: 3,
  timestamp: new Date().toISOString(),
  context: 'fetchProfile'
});
```

### 4. Suppress Toast When Needed

```typescript
// Silent logging (no user notification)
handleError(error, {
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.WARNING,
  showToast: false, // Don't show toast
  logToConsole: true // Still log to console
});
```

### 5. Silent Console in Production

```typescript
// Development: log to console
// Production: suppress console, send to monitoring
const isProduction = import.meta.env.PROD;

handleError(error, {
  category: ErrorCategory.AUTH,
  severity: ErrorSeverity.ERROR,
  userMessage: "Inloggningen misslyckades",
  logToConsole: !isProduction
});
```

---

## 🔌 Future: External Monitoring Integration

The error handling system is designed to integrate with external monitoring services. Here's how to add Sentry:

### 1. Install Sentry

```bash
npm install @sentry/react
```

### 2. Initialize Sentry

```typescript
// src/lib/monitoring.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### 3. Update Error Handler

```typescript
// src/lib/errorHandling.ts
import * as Sentry from "@sentry/react";

export function handleError(error, context) {
  // ... existing code ...

  // Send to Sentry for ERROR and CRITICAL
  if (
    import.meta.env.PROD &&
    (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL)
  ) {
    Sentry.captureException(error, {
      level: severity === ErrorSeverity.CRITICAL ? 'fatal' : 'error',
      tags: {
        category: context.category,
      },
      extra: {
        metadata: context.metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    });
  }
}
```

---

## 📈 Usage Examples from Codebase

### Example 1: Auth Hook (useAuth.tsx)

```typescript
// Profile fetch error
if (error) {
  handleDatabaseError(error, "Kunde inte hämta profil", {
    userId: sessionUser.id,
    retryCount
  });
  return;
}

// Critical error after retries
handleError(new Error("Profile not found after 3 retries"), {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.CRITICAL,
  userMessage: "Kunde inte ladda profil. Se SUPABASE_DATABASE_SETUP.md för hjälp.",
  metadata: { userId: sessionUser.id, retries: 3 }
});
```

### Example 2: Account Deletion

```typescript
try {
  const { data, error } = await supabase.functions.invoke('delete-user');

  if (error) {
    handleAuthError(error, "Kunde inte radera kontot", {
      location: 'deleteAccount-invoke'
    });
    return { error: new Error("Kunde inte radera kontot") };
  }
} catch (error) {
  handleError(error, {
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.ERROR,
    userMessage: "Ett oväntat fel uppstod vid kontoradering",
    metadata: { location: 'deleteAccount-catch' }
  });
}
```

---

## 🧪 Testing Error Handling

### Manual Testing

```typescript
// Test different error types
import { handleError, ErrorCategory, ErrorSeverity } from "@/lib/errorHandling";

// Info message
handleError(new Error("Test"), {
  category: ErrorCategory.AUTH,
  severity: ErrorSeverity.INFO,
  userMessage: "Test info message"
});

// Warning
handleError(new Error("Test"), {
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.WARNING,
  userMessage: "Test warning message"
});

// Error
handleError(new Error("Test"), {
  category: ErrorCategory.DATABASE,
  severity: ErrorSeverity.ERROR,
  userMessage: "Test error message"
});

// Critical
handleError(new Error("Test"), {
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.CRITICAL,
  userMessage: "Test critical message"
});
```

### Verify Error Log

```typescript
import { getErrorLog, getErrorStats } from "@/lib/errorHandling";

// After triggering errors
const log = getErrorLog();
console.log("Logged errors:", log);

const stats = getErrorStats();
console.log("Error statistics:", stats);
```

---

## 📝 Migration Checklist

To migrate existing error handling to the centralized system:

- [x] Created `src/lib/errorHandling.ts` utility
- [x] Updated `src/hooks/useAuth.tsx` to use centralized errors
- [ ] Update `src/pages/Auth.tsx` error handling
- [ ] Update `src/pages/Settings.tsx` error handling
- [ ] Update expense/income mutation error handling
- [ ] Update group management error handling
- [ ] Update file import error handling
- [ ] Add error log viewer in Settings (optional)
- [ ] Set up Sentry integration (optional)

---

## 🎓 Summary

The centralized error handling system provides:

1. **Consistency** - All errors handled the same way
2. **User Experience** - Clear, Swedish error messages
3. **Developer Experience** - Easy to use, well-documented
4. **Debugging** - Comprehensive error logs with metadata
5. **Monitoring** - Ready for production monitoring tools
6. **Extensibility** - Easy to add new error types/handlers

Use the specialized handlers (`handleAuthError`, `handleDatabaseError`, etc.) for common cases, and the generic `handleError` function for full control.

---

**For questions or improvements, see the implementation in `src/lib/errorHandling.ts`**
