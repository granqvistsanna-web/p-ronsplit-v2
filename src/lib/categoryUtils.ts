/**
 * Category data aggregation utilities for analytics.
 */

import type { Expense } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/types";

/**
 * Category aggregation result for chart visualization.
 */
export interface CategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
  icon: string;
}

/**
 * Aggregates expenses by category, summing amounts per category.
 *
 * @param expenses - Array of expenses to aggregate
 * @returns Array of CategoryData sorted by amount descending (highest spending first)
 *
 * @example
 * ```typescript
 * const expenses = [
 *   { id: '1', amount: 5000, category: 'mat', ... },
 *   { id: '2', amount: 3000, category: 'transport', ... },
 *   { id: '3', amount: 2000, category: 'mat', ... },
 * ];
 * const categoryData = aggregateByCategory(expenses);
 * // Returns: [
 * //   { categoryId: 'mat', categoryName: 'Mat', amount: 7000, color: '...', icon: '🛒' },
 * //   { categoryId: 'transport', categoryName: 'Transport', amount: 3000, color: '...', icon: '🚗' }
 * // ]
 * ```
 */
export function aggregateByCategory(expenses: Expense[]): CategoryData[] {
  // Handle empty array early
  if (!expenses || expenses.length === 0) {
    return [];
  }

  // Group expenses by category using reduce - single-pass aggregation
  const categoryMap = expenses.reduce<Record<string, number>>((acc, expense) => {
    // Fallback to 'ovrigt' for unknown categories
    const category = expense.category || 'ovrigt';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});

  // Map to CategoryData with metadata from DEFAULT_CATEGORIES
  const categoryData = Object.entries(categoryMap).map(([categoryId, amount]) => {
    // Find category metadata, fallback to 'ovrigt' if not found
    const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
      || DEFAULT_CATEGORIES.find(c => c.id === 'ovrigt')!;

    return {
      categoryId,
      categoryName: categoryInfo.name,
      amount,
      color: categoryInfo.color,
      icon: categoryInfo.icon,
    };
  });

  // Sort by amount descending (highest spending first)
  return categoryData.sort((a, b) => b.amount - a.amount);
}
