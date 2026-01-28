/**
 * Centralized configuration for React Query settings.
 *
 * Different data types have different freshness requirements:
 * - Expenses/Incomes: Change frequently, need shorter stale time
 * - Users/Groups: Rarely change, can have longer stale time
 */

/** Stale time for frequently-changing data (expenses, incomes, settlements) */
export const STALE_TIME_FREQUENT = 30 * 1000; // 30 seconds

/** Stale time for rarely-changing data (users, groups, profiles) */
export const STALE_TIME_STATIC = 5 * 60 * 1000; // 5 minutes

/** Default stale time for queries that don't specify their own */
export const STALE_TIME_DEFAULT = STALE_TIME_STATIC;

/** GC time - how long to keep inactive data in cache */
export const GC_TIME_DEFAULT = 10 * 60 * 1000; // 10 minutes
