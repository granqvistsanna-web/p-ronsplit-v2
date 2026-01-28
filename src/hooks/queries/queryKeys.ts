/**
 * Query key factory for React Query.
 * Implements the hierarchical query key pattern from TkDodo's blog:
 * https://tkdodo.eu/blog/effective-react-query-keys
 *
 * This provides:
 * - Granular cache invalidation (invalidate all, all lists, or specific filtered lists)
 * - Consistent cache keys across the codebase
 * - Automatic refetching when filter parameters change
 *
 * Usage examples:
 * - Invalidate all expenses: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
 * - Invalidate all expense lists: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() })
 * - Invalidate specific filtered list: queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(filters) })
 */

import type { ExpenseFilters, IncomeFilters, BudgetFilters } from './types';

/**
 * Serializes a filter object by converting Date objects to ISO strings.
 * This is necessary because React Query compares keys by value, and
 * Date objects would always be different references even if they represent
 * the same timestamp.
 */
type SerializedFilters<T> = T extends { dateRange?: infer DR }
  ? DR extends { start: Date; end: Date }
    ? Omit<T, 'dateRange'> & {
        dateRange?: {
          start: string;
          end: string;
        };
      }
    : T
  : T;

/**
 * Serializes filter parameters for stable query key comparison.
 */
function serializeFilters<T extends ExpenseFilters | IncomeFilters>(
  filters: T
): SerializedFilters<T> {
  if (!filters.dateRange) {
    return filters as SerializedFilters<T>;
  }

  return {
    ...filters,
    dateRange: {
      start: filters.dateRange.start.toISOString(),
      end: filters.dateRange.end.toISOString(),
    },
  } as SerializedFilters<T>;
}

/**
 * Centralized query key factory.
 * Provides hierarchical keys for expenses and incomes.
 */
export const queryKeys = {
  /**
   * Expense query keys.
   */
  expenses: {
    /** Base key for all expense queries - use to invalidate everything */
    all: ['expenses'] as const,
    /** Key for all expense lists - use to invalidate all filtered/unfiltered lists */
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    /** Key for a specific filtered expense list */
    list: (filters: ExpenseFilters) =>
      [...queryKeys.expenses.lists(), serializeFilters(filters)] as const,
  },
  /**
   * Income query keys.
   */
  incomes: {
    /** Base key for all income queries - use to invalidate everything */
    all: ['incomes'] as const,
    /** Key for all income lists - use to invalidate all filtered/unfiltered lists */
    lists: () => [...queryKeys.incomes.all, 'list'] as const,
    /** Key for a specific filtered income list */
    list: (filters: IncomeFilters) =>
      [...queryKeys.incomes.lists(), serializeFilters(filters)] as const,
  },
  /**
   * Budget query keys.
   */
  budgets: {
    /** Base key for all budget queries - use to invalidate everything */
    all: ['budgets'] as const,
    /** Key for all budget lists - use to invalidate all filtered/unfiltered lists */
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    /** Key for a specific filtered budget list */
    list: (filters: BudgetFilters) =>
      [...queryKeys.budgets.lists(), filters] as const,
  },
} as const;
