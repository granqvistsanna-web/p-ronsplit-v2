/**
 * Consolidated type definitions for the application.
 * Uses snake_case to match database schema.
 * This is the single source of truth for domain types.
 */

import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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
  splits: ExpenseSplit | null;
  repeat: ExpenseRepeat;
}

export type IncomeType = "salary" | "bonus" | "benefit" | "fkassa" | "bidrag" | "other";
export type IncomeRepeat = "none" | "monthly";

/**
 * Income entry.
 */
export interface Income {
  id: string;
  group_id: string;
  amount: number; // Stored in cents (öre)
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
 */
export interface IncomeInput {
  group_id: string;
  amount: number;
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
