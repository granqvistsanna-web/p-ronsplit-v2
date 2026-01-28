/**
 * Category data aggregation utilities for analytics.
 */

import type { Expense, GroupMember } from "@/lib/types";
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
 * Stacked category data for member breakdown visualization.
 * Contains category info plus dynamic keys for each member's spending.
 */
export interface StackedCategoryData {
  categoryId: string;
  categoryName: string;
  icon: string;
  [memberId: string]: number | string; // Dynamic member keys for amounts
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

/**
 * Aggregates expenses by category and member, creating stacked data for visualization.
 *
 * @param expenses - Array of expenses to aggregate
 * @param members - Array of group members for consistent ordering
 * @returns Array of StackedCategoryData sorted by total amount descending
 *
 * @example
 * ```typescript
 * const expenses = [
 *   { id: '1', amount: 1000, category: 'mat', paid_by: 'user1', ... },
 *   { id: '2', amount: 500, category: 'mat', paid_by: 'user2', ... },
 *   { id: '3', amount: 300, category: 'transport', paid_by: 'user1', ... },
 * ];
 * const members = [
 *   { id: 'user1', user_id: 'user1', name: 'Anna' },
 *   { id: 'user2', user_id: 'user2', name: 'Erik' },
 * ];
 * const stackedData = aggregateByCategoryAndMember(expenses, members);
 * // Returns: [
 * //   { categoryId: 'mat', categoryName: 'Mat', user1: 1000, user2: 500 },
 * //   { categoryId: 'transport', categoryName: 'Transport', user1: 300, user2: 0 }
 * // ]
 * ```
 */
export function aggregateByCategoryAndMember(
  expenses: Expense[],
  members: GroupMember[]
): StackedCategoryData[] {
  // Handle empty array early
  if (!expenses || expenses.length === 0 || !members || members.length === 0) {
    return [];
  }

  // Group expenses by category, then by member
  const categoryMap = new Map<string, Map<string, number>>();

  expenses.forEach(expense => {
    const category = expense.category || 'ovrigt';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map());
    }

    const memberMap = categoryMap.get(category)!;
    const currentAmount = memberMap.get(expense.paid_by) || 0;
    memberMap.set(expense.paid_by, currentAmount + expense.amount);
  });

  // Convert to StackedCategoryData with all member keys
  // Use a separate array for sorting to avoid unsafe type casting
  const dataWithTotals: Array<{ data: StackedCategoryData; total: number }> = [];

  categoryMap.forEach((memberMap, categoryId) => {
    // Find category metadata
    const categoryInfo = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
      || DEFAULT_CATEGORIES.find(c => c.id === 'ovrigt')!;

    // Create data object with category info
    const data: StackedCategoryData = {
      categoryId,
      categoryName: categoryInfo.name,
      icon: categoryInfo.icon,
    };

    // Add each member's amount (0 if they didn't spend in this category)
    let totalAmount = 0;
    members.forEach(member => {
      const amount = memberMap.get(member.user_id) || 0;
      data[member.user_id] = amount;
      totalAmount += amount;
    });

    dataWithTotals.push({ data, total: totalAmount });
  });

  // Sort by total amount descending and extract just the data
  return dataWithTotals
    .sort((a, b) => b.total - a.total)
    .map(item => item.data);
}
