import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ExpenseSplit {
  [userId: string]: number;
}

export type ExpenseRepeat = "none" | "monthly" | "yearly";

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

export function useExpenses(groupId?: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const parseSplits = (value: unknown): ExpenseSplit | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const record = value as Record<string, unknown>;
      const out: ExpenseSplit = {};

      for (const [userId, raw] of Object.entries(record)) {
        const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
        if (!Number.isFinite(n)) return null;
        out[userId] = n;
      }

      return out;
    };

    try {
      let query = supabase.from("expenses").select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;

      const normalized = (data ?? []).map((row: any) => ({
        ...row,
        splits: parseSplits(row.splits),
      })) as Expense[];

      setExpenses(normalized);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Kunde inte hämta utgifter");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (expense: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
    splits?: ExpenseSplit | null;
    repeat?: ExpenseRepeat;
  }) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return null;
    }

    try {
      // Build insert payload - only include splits if it has a value
      const insertData: {
        group_id: string;
        amount: number;
        paid_by: string;
        category: string;
        description: string;
        date: string;
        splits?: ExpenseSplit | null;
        repeat: ExpenseRepeat;
      } = {
        group_id: expense.group_id,
        amount: expense.amount,
        paid_by: user.id, // Always use current user
        category: expense.category,
        description: expense.description,
        date: expense.date,
        repeat: expense.repeat || "none",
      };

      // Only add splits if it's not null/undefined
      if (expense.splits) {
        insertData.splits = expense.splits;
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      await fetchExpenses();
      toast.success("Utgift tillagd!");
      return data;
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Kunde inte lägga till utgift");
      return null;
    }
  };

  const addExpenses = async (expenses: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
    splits?: ExpenseSplit | null;
    repeat?: ExpenseRepeat;
  }[]) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return [];
    }

    if (expenses.length === 0) {
      return [];
    }

    try {
      // Batch insert all expenses in a single query
      const { data, error } = await supabase
        .from("expenses")
        .insert(
          expenses.map(expense => ({
            ...expense,
            paid_by: user.id, // Always use current user
          }))
        )
        .select();

      if (error) throw error;

      await fetchExpenses();
      toast.success(`${expenses.length} utgifter tillagda!`);
      return data || [];
    } catch (error) {
      console.error("Error adding expenses:", error);
      toast.error("Kunde inte lägga till utgifter");
      return [];
    }
  };

  const updateExpense = async (
    expenseId: string,
    updates: Partial<Omit<Expense, "id" | "created_at">>
  ) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    try {
      // First, verify the user owns this expense
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) {
        toast.error("Utgiften hittades inte");
        return;
      }

      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", expenseId);

      if (error) throw error;

      await fetchExpenses();
      toast.success("Utgift uppdaterad!");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Kunde inte uppdatera utgift");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    try {
      // Find the expense to delete (for potential undo)
      const expenseToDelete = expenses.find(e => e.id === expenseId);
      if (!expenseToDelete) {
        toast.error("Utgiften hittades inte");
        return;
      }

      // Delete from database - any group member can delete expenses
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      await fetchExpenses();

      // Show toast with undo action
      let undoClicked = false;

      toast.success("Utgift borttagen!", {
        duration: 5000,
        action: {
          label: "Ångra",
          onClick: async () => {
            undoClicked = true;
            try {
              // Restore the expense
              const { error: restoreError } = await supabase
                .from("expenses")
                .insert({
                  id: expenseToDelete.id,
                  group_id: expenseToDelete.group_id,
                  amount: expenseToDelete.amount,
                  paid_by: expenseToDelete.paid_by,
                  category: expenseToDelete.category,
                  description: expenseToDelete.description,
                  date: expenseToDelete.date,
                  splits: expenseToDelete.splits,
                });

              if (restoreError) throw restoreError;

              await fetchExpenses();
              toast.success("Utgift återställd!");
            } catch (restoreError) {
              console.error("Error restoring expense:", restoreError);
              toast.error("Kunde inte återställa utgift");
            }
          },
        },
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Kunde inte ta bort utgift");
    }
  };

  return {
    expenses,
    loading,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
