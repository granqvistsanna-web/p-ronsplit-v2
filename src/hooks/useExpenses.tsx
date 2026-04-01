import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError, handleAuthError } from "@/lib/errorHandling";
import { queryKeys } from "./queries/queryKeys";
import { STALE_TIME_FREQUENT } from "./queries/config";
import type { ExpenseFilters } from "./queries/types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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

/**
 * Parse splits from database JSONB to ExpenseSplit type.
 * Skips invalid entries instead of discarding all data.
 * Internal helper function.
 */
const parseSplits = (value: unknown): ExpenseSplit | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const out: ExpenseSplit = {};

  for (const [userId, raw] of Object.entries(record)) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(n)) {
      // Skip invalid entry but continue processing others
      console.warn(`Invalid split value for user ${userId}:`, raw);
      continue;
    }
    out[userId] = n;
  }

  // Return null only if no valid entries were found
  return Object.keys(out).length > 0 ? out : null;
};

export function useExpenses(filters: ExpenseFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching expenses with filters
  const query = useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Build Supabase query with filters
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("group_id", filters.groupId)
        .order("date", { ascending: false });

      // Apply date range filter if provided
      if (filters.dateRange) {
        query = query
          .gte("date", filters.dateRange.start.toISOString().split("T")[0])
          .lte("date", filters.dateRange.end.toISOString().split("T")[0]);
      }

      // Apply member filter if provided
      if (filters.memberIds && filters.memberIds.length > 0) {
        query = query.in("paid_by", filters.memberIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching expenses:", error);
        throw error;
      }

      // Parse splits and normalize data
      return (data || []).map((row) => ({
        ...row,
        splits: parseSplits(row.splits),
      })) as Expense[];
    },
    enabled: !!filters.groupId && !!user,
    staleTime: STALE_TIME_FREQUENT,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation: Add single expense
  const addMutation = useMutation({
    mutationFn: async (expense: {
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
        throw new Error("Du måste vara inloggad");
      }

      // Build insert payload - serialize splits to JSON string for database
      const insertData: TablesInsert<'expenses'> = {
        group_id: expense.group_id,
        amount: expense.amount,
        paid_by: expense.paid_by || user.id,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        repeat: expense.repeat || "none",
        splits: expense.splits ? JSON.stringify(expense.splits) : null,
      };

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

      return data;
    },
    onSuccess: (_data, variables) => {
      // Only invalidate queries for the affected group
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.list({ groupId: variables.group_id }),
      });
      toast.success("Utgift tillagd!");
    },
    onError: (error) => {
      handleDatabaseError(error, "Kunde inte lägga till utgift", {
        operation: "addExpense",
      });
    },
  });

  // Mutation: Add multiple expenses (batch)
  const addExpensesMutation = useMutation({
    mutationFn: async (expenses: {
      group_id: string;
      amount: number;
      paid_by: string;
      category: string;
      description: string;
      date: string;
      splits?: ExpenseSplit | null;
      repeat?: ExpenseRepeat;
    }[]) => {
      console.log("[addExpenses] Called with", expenses.length, "expenses:", expenses);

      if (!user) {
        console.log("[addExpenses] No user, aborting");
        throw new Error("Du måste vara inloggad");
      }

      if (expenses.length === 0) {
        console.log("[addExpenses] Empty expenses array, aborting");
        return [];
      }

      // Batch insert all expenses in a single query - serialize splits as JSON
      const insertData: TablesInsert<'expenses'>[] = expenses.map((expense) => ({
        group_id: expense.group_id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        repeat: expense.repeat || "none",
        paid_by: expense.paid_by || user.id,
        splits: expense.splits ? JSON.stringify(expense.splits) : null,
      }));

      console.log("[addExpenses] Insert data prepared:", insertData);

      const { data, error } = await supabase
        .from("expenses")
        .insert(insertData)
        .select();

      if (error) {
        console.error("[addExpenses] Supabase error:", error);
        throw error;
      }

      console.log("[addExpenses] Insert successful, returned data:", data);

      return data || [];
    },
    onSuccess: (data, variables) => {
      // Only invalidate queries for the affected group (all expenses in batch share the same group)
      if (variables.length > 0) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.expenses.list({ groupId: variables[0].group_id }),
        });
      }
      console.log("[addExpenses] Refetch complete");
      toast.success(`${data.length} utgifter tillagda!`);
    },
    onError: (error) => {
      handleDatabaseError(error, "Kunde inte lägga till utgifter", {
        operation: "addExpenses",
      });
    },
  });

  // Mutation: Update expense
  const updateMutation = useMutation({
    mutationFn: async ({
      expenseId,
      updates,
    }: {
      expenseId: string;
      updates: Partial<Omit<Expense, "id" | "created_at">>;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      // First, verify the expense exists
      const expense = query.data?.find((e) => e.id === expenseId);
      if (!expense) {
        throw new Error("Utgiften hittades inte");
      }

      // Verify expense belongs to current group if groupId is set
      if (filters.groupId && expense.group_id !== filters.groupId) {
        throw new Error("Utgiften tillhör inte det valda hushållet");
      }

      // RLS handles access control - any group member can update expenses in their group

      // Serialize splits if present, build update payload
      const dbUpdates: TablesUpdate<'expenses'> = {
        amount: updates.amount,
        category: updates.category,
        description: updates.description,
        date: updates.date,
        repeat: updates.repeat,
        splits: updates.splits !== undefined
          ? (updates.splits ? JSON.stringify(updates.splits) : null)
          : undefined,
      };

      // Remove undefined fields to avoid overwriting with null
      const cleanUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([_, v]) => v !== undefined)
      ) as TablesUpdate<'expenses'>;

      const { error } = await supabase
        .from("expenses")
        .update(cleanUpdates)
        .eq("id", expenseId); // RLS handles access control

      if (error) throw error;
    },
    onSuccess: () => {
      // Only invalidate queries for the current group (from hook filters)
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.list({ groupId: filters.groupId }),
      });
      toast.success("Utgift uppdaterad!");
    },
    onError: (error: Error) => {
      handleDatabaseError(error, error.message || "Kunde inte uppdatera utgift", {
        operation: "updateExpense",
      });
    },
  });

  // Mutation: Delete expense with undo
  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      // Find the expense to delete (for potential undo)
      const expenseToDelete = query.data?.find((e) => e.id === expenseId);
      if (!expenseToDelete) {
        throw new Error("Utgiften hittades inte");
      }

      // Verify expense belongs to current group if groupId is set
      if (filters.groupId && expenseToDelete.group_id !== filters.groupId) {
        throw new Error("Utgiften tillhör inte det valda hushållet");
      }

      // Delete from database - any group member can delete
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      return expenseToDelete;
    },
    onSuccess: (expenseToDelete) => {
      // Only invalidate queries for the affected group
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.list({ groupId: expenseToDelete.group_id }),
      });

      // Show toast with undo action
      toast.success("Utgift borttagen!", {
        duration: 5000,
        action: {
          label: "Ångra",
          onClick: (() => {
            let restored = false;
            return async () => {
              if (restored) return; // Prevent double-click
              restored = true;
              try {
                // Restore the expense
                const restoreData: TablesInsert<'expenses'> = {
                  id: expenseToDelete.id,
                  group_id: expenseToDelete.group_id,
                  amount: expenseToDelete.amount,
                  paid_by: expenseToDelete.paid_by,
                  category: expenseToDelete.category,
                  description: expenseToDelete.description,
                  date: expenseToDelete.date,
                  splits: expenseToDelete.splits ? JSON.stringify(expenseToDelete.splits) : null,
                  repeat: expenseToDelete.repeat || "none",
                };
                const { error: restoreError } = await supabase.from("expenses").insert(restoreData);

                if (restoreError) throw restoreError;

                // Only invalidate queries for the affected group
                queryClient.invalidateQueries({
                  queryKey: queryKeys.expenses.list({ groupId: expenseToDelete.group_id }),
                });
                toast.success("Utgift återställd!");
              } catch (restoreError) {
                handleDatabaseError(restoreError, "Kunde inte återställa utgift. Försök igen eller kontakta support.", {
                  operation: "restoreExpense",
                  expenseId: expenseToDelete.id,
                });
              }
            };
          })(),
        },
      });
    },
    onError: (error: Error) => {
      handleDatabaseError(error, error.message || "Kunde inte ta bort utgift", {
        operation: "deleteExpense",
      });
    },
  });

  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    addExpense: addMutation.mutateAsync,
    addExpenses: addExpensesMutation.mutateAsync,
    updateExpense: async (
      expenseId: string,
      updates: Partial<Omit<Expense, "id" | "created_at">>
    ) => {
      await updateMutation.mutateAsync({ expenseId, updates });
    },
    deleteExpense: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
