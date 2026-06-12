/**
 * Filter type definitions for data fetching hooks.
 * These types are used to create query keys and enable automatic
 * refetching when URL filter parameters change.
 */

/**
 * Date range filter for filtering data by date.
 * Used to restrict queries to a specific time period.
 */
export interface DateRangeFilter {
  /** Start date of the filter range (inclusive) */
  start: Date;
  /** End date of the filter range (inclusive) */
  end: Date;
}

/**
 * Filter parameters for expense queries.
 * Combines household context with optional date and member filters.
 */
export interface ExpenseFilters {
  /** ID of the household/group to fetch expenses for */
  groupId: string;
  /** Optional date range to filter expenses by date field */
  dateRange?: DateRangeFilter;
  /** Optional array of member IDs to filter expenses by paid_by field */
  memberIds?: string[];
}

/**
 * Filter parameters for income queries.
 * Combines household context with optional date and recipient filters.
 */
export interface IncomeFilters {
  /** ID of the household/group to fetch incomes for */
  groupId: string;
  /** Optional date range to filter incomes by date field */
  dateRange?: DateRangeFilter;
  /** Optional array of member IDs to filter incomes by recipient field */
  memberIds?: string[];
}

