/**
 * Budget calculation utilities.
 * Provides status calculations and metrics for budget tracking.
 */

import type { Budget } from "@/hooks/useBudgets";
import type { Expense, Category } from "./types";
import { DEFAULT_CATEGORIES, öreToKr } from "./types";
import { getDate, getDaysInMonth, differenceInDays } from "date-fns";

/**
 * Budget status based on spending percentage.
 * - on-track: < 80% of budget spent
 * - warning: 80-99% of budget spent
 * - exceeded: >= 100% of budget spent
 */
export type BudgetStatus = "on-track" | "warning" | "exceeded";

/**
 * Budget pacing status based on time elapsed in period.
 * - on-track: Spending at or below expected pace
 * - over-pace: Spending faster than expected
 */
export type PacingStatus = "on-track" | "over-pace";

/**
 * Budget metric for a single category.
 */
export interface BudgetMetric {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  budget: number; // In kr
  spent: number; // In kr
  remaining: number; // In kr (can be negative)
  percentUsed: number;
  status: BudgetStatus;
}

/**
 * Summary of all budget metrics.
 */
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  status: BudgetStatus;
  categoriesOnTrack: number;
  categoriesWarning: number;
  categoriesExceeded: number;
}

/**
 * Get budget status based on percentage used.
 *
 * @param percentUsed - Percentage of budget already spent
 * @returns Status indicator
 */
export function getBudgetStatus(percentUsed: number): BudgetStatus {
  if (percentUsed >= 100) return "exceeded";
  if (percentUsed >= 80) return "warning";
  return "on-track";
}

/**
 * Get CSS color class for budget status.
 *
 * @param status - Budget status
 * @returns Tailwind color class
 */
export function getBudgetStatusColor(status: BudgetStatus): string {
  switch (status) {
    case "on-track":
      return "text-green-600 dark:text-green-400";
    case "warning":
      return "text-yellow-600 dark:text-yellow-400";
    case "exceeded":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get background color class for budget status progress bars.
 *
 * @param status - Budget status
 * @returns Tailwind background color class
 */
export function getBudgetProgressColor(status: BudgetStatus): string {
  switch (status) {
    case "on-track":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "exceeded":
      return "bg-red-500";
  }
}

/**
 * Calculate budget pacing status based on time elapsed in period.
 * Compares actual spending to expected spending based on days elapsed.
 *
 * @param spent - Amount spent so far (in kr)
 * @param budget - Total budget amount (in kr)
 * @param year - Current year
 * @param month - Current month (0-11) for monthly, undefined for yearly
 * @returns Pacing status and expected spending amount
 */
export function calculateBudgetPacing(
  spent: number,
  budget: number,
  year: number,
  month?: number
): { pacing: PacingStatus; expectedSpending: number } {
  const now = new Date();
  let currentDay: number;
  let totalDays: number;

  if (month !== undefined) {
    // Monthly pacing - use actual days in month
    currentDay = getDate(now);
    totalDays = getDaysInMonth(new Date(year, month));
  } else {
    // Yearly pacing - calculate day of year
    const startOfYear = new Date(year, 0, 1);
    currentDay = differenceInDays(now, startOfYear) + 1;
    totalDays = 365 + (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0);
  }

  const expectedSpending = (budget * currentDay) / totalDays;
  const pacing: PacingStatus = spent <= expectedSpending ? "on-track" : "over-pace";

  return { pacing, expectedSpending };
}

/**
 * Aggregate expenses by category for a date range.
 *
 * @param expenses - Array of expenses
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @returns Map of categoryId to total spent in kr
 */
export function aggregateExpensesByCategory(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Record<string, number> {
  const result: Record<string, number> = {};

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  for (const expense of expenses) {
    // Filter by date range
    if (expense.date < startStr || expense.date > endStr) {
      continue;
    }

    const categoryId = expense.category.toLowerCase();
    const amount = expense.amount || 0;

    if (!result[categoryId]) {
      result[categoryId] = 0;
    }
    result[categoryId] += amount;
  }

  return result;
}

/**
 * Aggregate expenses by category for a specific year.
 *
 * @param expenses - Array of expenses
 * @param year - Year to filter by
 * @returns Map of categoryId to total spent in kr
 */
export function aggregateYearlyExpenses(
  expenses: Expense[],
  year: number
): Record<string, number> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  return aggregateExpensesByCategory(expenses, startDate, endDate);
}

/**
 * Aggregate expenses by category for a specific month.
 *
 * @param expenses - Array of expenses
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Map of categoryId to total spent in kr
 */
export function aggregateMonthlyExpenses(
  expenses: Expense[],
  year: number,
  month: number
): Record<string, number> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month
  return aggregateExpensesByCategory(expenses, startDate, endDate);
}

/**
 * Get category info by ID.
 *
 * @param categoryId - Category ID to look up
 * @returns Category info or default fallback
 */
export function getCategoryInfo(categoryId: string): Category {
  const category = DEFAULT_CATEGORIES.find(
    (c) => c.id.toLowerCase() === categoryId.toLowerCase()
  );
  return (
    category || {
      id: categoryId,
      name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      icon: "📦",
      color: "hsl(0, 0%, 50%)",
    }
  );
}

/**
 * Calculate budget metrics for all budgets.
 *
 * @param budgets - Array of budgets (amounts in öre)
 * @param expenses - Array of expenses (amounts in kr)
 * @param year - Year to calculate for
 * @param month - Optional month (0-11) for monthly budgets, omit for yearly
 * @returns Array of budget metrics sorted by percent used (highest first)
 */
export function calculateBudgetMetrics(
  budgets: Budget[],
  expenses: Expense[],
  year: number,
  month?: number
): BudgetMetric[] {
  // Calculate spent amounts based on period
  const spentByCategory =
    month !== undefined
      ? aggregateMonthlyExpenses(expenses, year, month)
      : aggregateYearlyExpenses(expenses, year);

  const metrics: BudgetMetric[] = budgets
    .filter((budget) => budget.enabled)
    .map((budget) => {
      const categoryInfo = getCategoryInfo(budget.category);
      const budgetAmount = öreToKr(budget.amount); // Convert from öre to kr
      const spent = spentByCategory[budget.category.toLowerCase()] || 0;
      const remaining = budgetAmount - spent;
      const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      const status = getBudgetStatus(percentUsed);

      return {
        categoryId: budget.category,
        categoryName: categoryInfo.name,
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        budget: budgetAmount,
        spent,
        remaining,
        percentUsed,
        status,
      };
    });

  // Sort by percent used descending (highest spending first)
  return metrics.sort((a, b) => b.percentUsed - a.percentUsed);
}

/**
 * Calculate overall budget summary.
 *
 * @param metrics - Array of budget metrics
 * @returns Summary with totals and counts
 */
export function calculateBudgetSummary(metrics: BudgetMetric[]): BudgetSummary {
  const totalBudget = metrics.reduce((sum, m) => sum + m.budget, 0);
  const totalSpent = metrics.reduce((sum, m) => sum + m.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const status = getBudgetStatus(percentUsed);

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    percentUsed,
    status,
    categoriesOnTrack: metrics.filter((m) => m.status === "on-track").length,
    categoriesWarning: metrics.filter((m) => m.status === "warning").length,
    categoriesExceeded: metrics.filter((m) => m.status === "exceeded").length,
  };
}

/**
 * Format budget amount for display.
 *
 * @param amount - Amount in kr
 * @param showSign - Whether to show + for positive remaining
 * @returns Formatted string (e.g., "12 500 kr")
 */
export function formatBudgetAmount(
  amount: number,
  showSign: boolean = false
): string {
  const formatted = Math.abs(Math.round(amount)).toLocaleString("sv-SE");
  const sign = showSign && amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatted} kr`;
}

/**
 * Get suggested budget based on historical spending.
 *
 * @param expenses - Array of expenses
 * @param categoryId - Category to calculate for
 * @param monthsOfHistory - Number of months to average
 * @returns Suggested monthly budget in kr
 */
export function getSuggestedBudget(
  expenses: Expense[],
  categoryId: string,
  monthsOfHistory: number = 6
): number {
  const now = new Date();
  const categoryLower = categoryId.toLowerCase();
  let totalSpent = 0;

  for (let i = 0; i < monthsOfHistory; i++) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;
    const adjustedYear = month < 0 ? year - 1 : year;
    const adjustedMonth = month < 0 ? 12 + month : month;

    const monthly = aggregateMonthlyExpenses(expenses, adjustedYear, adjustedMonth);
    totalSpent += monthly[categoryLower] || 0;
  }

  // Return average monthly spending, rounded up to nearest 100
  const average = totalSpent / monthsOfHistory;
  return Math.ceil(average / 100) * 100;
}
