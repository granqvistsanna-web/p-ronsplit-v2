/**
 * Centralized Error Handling Utility
 *
 * Provides consistent error logging, user feedback, and monitoring capabilities.
 * Can be extended with services like Sentry for production monitoring.
 */

import { toast } from "sonner";

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTH = 'auth',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage?: string;
  metadata?: Record<string, unknown>;
  showToast?: boolean;
  logToConsole?: boolean;
}

interface ErrorLog {
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  error: Error | unknown;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

// In-memory error log (last 50 errors)
// In production, this could be sent to an external monitoring service
const errorLog: ErrorLog[] = [];
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Main error handler - use this throughout the app for consistent error handling
 */
export function handleError(
  error: Error | unknown,
  context: ErrorContext
): void {
  const {
    category,
    severity,
    userMessage,
    metadata = {},
    showToast = true,
    logToConsole = true
  } = context;

  // Create error log entry
  const logEntry: ErrorLog = {
    timestamp: new Date().toISOString(),
    category,
    severity,
    error,
    metadata,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Add to in-memory log
  errorLog.push(logEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift(); // Remove oldest entry
  }

  // Console logging
  if (logToConsole) {
    const logMethod = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR
      ? console.error
      : console.warn;

    logMethod(`[${severity.toUpperCase()}] ${category}:`, {
      error,
      metadata,
      timestamp: logEntry.timestamp
    });
  }

  // User feedback via toast
  if (showToast) {
    const message = userMessage || getDefaultUserMessage(category, severity);

    switch (severity) {
      case ErrorSeverity.INFO:
        toast.info(message);
        break;
      case ErrorSeverity.WARNING:
        toast.warning(message);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        toast.error(message);
        break;
    }
  }

}

/**
 * Get default user-friendly message based on error category and severity
 */
function getDefaultUserMessage(
  category: ErrorCategory,
  severity: ErrorSeverity
): string {
  if (severity === ErrorSeverity.INFO) {
    return "Information";
  }

  const messages: Record<ErrorCategory, string> = {
    [ErrorCategory.AUTH]: "Ett autentiseringsfel uppstod. Försök igen eller logga in på nytt.",
    [ErrorCategory.DATABASE]: "Ett databasfel uppstod. Försök igen om en stund.",
    [ErrorCategory.NETWORK]: "Nätverksfel. Kontrollera din internetanslutning.",
    [ErrorCategory.VALIDATION]: "Felaktig inmatning. Kontrollera dina uppgifter.",
    [ErrorCategory.PERMISSION]: "Du har inte behörighet för denna åtgärd.",
    [ErrorCategory.UNKNOWN]: "Ett oväntat fel uppstod. Försök igen."
  };

  return messages[category] || messages[ErrorCategory.UNKNOWN];
}

/**
 * Auth-specific error handler
 */
export function handleAuthError(
  error: Error | unknown,
  userMessage?: string,
  metadata?: Record<string, unknown>
): void {
  handleError(error, {
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.ERROR,
    userMessage,
    metadata
  });
}

/**
 * Database-specific error handler
 */
export function handleDatabaseError(
  error: Error | unknown,
  userMessage?: string,
  metadata?: Record<string, unknown>
): void {
  handleError(error, {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.ERROR,
    userMessage,
    metadata
  });
}

/**
 * Network-specific error handler
 */
export function handleNetworkError(
  error: Error | unknown,
  userMessage?: string,
  metadata?: Record<string, unknown>
): void {
  handleError(error, {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    userMessage,
    metadata
  });
}

/**
 * Validation-specific error handler
 */
export function handleValidationError(
  error: Error | unknown,
  userMessage?: string,
  metadata?: Record<string, unknown>
): void {
  handleError(error, {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    userMessage,
    metadata
  });
}
