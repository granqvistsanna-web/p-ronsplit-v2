/**
 * Consolidated type definitions for the application.
 * Uses snake_case to match database schema.
 * This is the single source of truth for domain types.
 */

import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Ore } from "@/lib/currency";

// ============================================================================
// Database-derived types (from Supabase)
// ============================================================================

// Row types from database
export type ExpenseRow = Tables<"expenses">;
export type IncomeRow = Tables<"incomes">;
export type SettlementRow = Tables<"settlements">;
export type GroupRow = Tables<"groups">;
export type ProfileRow = Tables<"profiles">;
export type GroupMemberRow = Tables<"group_members">;
export type SavingsProjectRow = Tables<"savings_projects">;
export type SavingsContributionRow = Tables<"savings_contributions">;
export type PeriodRow = Tables<"periods">;

// Insert types
export type ExpenseInsert = TablesInsert<"expenses">;
export type IncomeInsert = TablesInsert<"incomes">;
export type SettlementInsert = TablesInsert<"settlements">;
export type GroupInsert = TablesInsert<"groups">;

// Update types
export type ExpenseUpdate = TablesUpdate<"expenses">;
export type IncomeUpdate = TablesUpdate<"incomes">;
export type SettlementUpdate = TablesUpdate<"settlements">;

// ============================================================================
// Application types (extended from database types)
// ============================================================================

/**
 * Split distribution for expenses.
 * Maps user_id to their share amount.
 */
export type ExpenseSplit = {
  [userId: string]: number;
};

export type ExpenseRepeat = "none" | "monthly" | "yearly";

/**
 * Expense with parsed splits (database stores as JSON string).
 */
export interface Expense {
  id: string;
  group_id: string;
  amount: number;
  paid_by: string;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
  splits?: ExpenseSplit | null;
  repeat: ExpenseRepeat;
}

export type IncomeType = "salary" | "bonus" | "benefit" | "fkassa" | "bidrag" | "other";
export type IncomeRepeat = "none" | "monthly";

// ============================================================================
// Income amount units
// ============================================================================
/**
 * IMPORTANT: Income amounts are stored in CENTS (öre) in the database.
 * This differs from expenses which are stored in kr.
 *
 * When displaying: use toKronor() from @/lib/currency
 * When storing: use toOre() from @/lib/currency
 *
 * @see @/lib/currency for conversion functions
 */

/**
 * Income entry.
 *
 * NOTE: The `amount` field is stored in CENTS (öre), not kr.
 * Use toKronor(income.amount) from @/lib/currency to convert for display.
 */
export interface Income {
  id: string;
  group_id: string;
  /** Amount in öre (cents). Branded type ensures type safety. */
  amount: Ore;
  recipient: string;
  type: IncomeType;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  repeat: IncomeRepeat;
  included_in_split: boolean;
}

/**
 * Input type for creating new incomes.
 *
 * NOTE: The `amount` field should be in CENTS (öre), not kr.
 * Use toOre() from @/lib/currency when converting user input.
 */
export interface IncomeInput {
  group_id: string;
  /** Amount in öre (cents). Use toOre() to convert from user input. */
  amount: Ore;
  recipient: string;
  type: IncomeType;
  note?: string;
  date: string;
  repeat?: IncomeRepeat;
  included_in_split?: boolean;
}

/**
 * Settlement between group members.
 */
export interface Settlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  date: string;
  month: string;
  created_at: string;
}

/**
 * Group member with profile info.
 */
export interface GroupMember {
  id: string;
  user_id: string;
  name: string;
}

/**
 * Group with members.
 */
export interface Group {
  id: string;
  name: string;
  is_temporary: boolean;
  created_by: string;
  created_at: string;
  invite_code: string;
  members: GroupMember[];
}

/**
 * A user-controlled period (replaces auto month ranges).
 * Expenses/incomes are matched to periods by date range.
 */
export interface Period {
  id: string;
  group_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  created_by: string;
}

/**
 * User profile.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ============================================================================
// Category types
// ============================================================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'mat', name: 'Mat', icon: '🛒', color: 'hsl(155, 55%, 42%)' },
  { id: 'boende', name: 'Boende', icon: '🏠', color: 'hsl(220, 60%, 55%)' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: 'hsl(38, 92%, 50%)' },
  { id: 'noje', name: 'Nöje', icon: '🎬', color: 'hsl(280, 60%, 55%)' },
  { id: 'restaurang', name: 'Restaurang', icon: '🍽️', color: 'hsl(15, 80%, 50%)' },
  { id: 'alkohol', name: 'Alkohol', icon: '🍺', color: 'hsl(45, 70%, 50%)' },
  { id: 'klader', name: 'Kläder', icon: '👕', color: 'hsl(330, 70%, 55%)' },
  { id: 'halsa', name: 'Hälsa', icon: '💊', color: 'hsl(120, 50%, 50%)' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'hsl(300, 65%, 55%)' },
  { id: 'resor', name: 'Resor', icon: '✈️', color: 'hsl(200, 70%, 50%)' },
  { id: 'ovrigt', name: 'Övrigt', icon: '📦', color: 'hsl(0, 0%, 50%)' },
];

// ============================================================================
// Savings types
// ============================================================================

export interface SavingsProject {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsContribution {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}
