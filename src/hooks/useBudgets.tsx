import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError } from "@/lib/errorHandling";
import { queryKeys } from "./queries/queryKeys";
import { STALE_TIME_FREQUENT } from "./queries/config";
import type { BudgetFilters } from "./queries/types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Budget entity as returned from the database.
 * Amount is stored in ore (BIGINT) to prevent floating-point errors.
 */
export interface Budget {
  id: string;
  group_id: string;
  category: string;
  amount: number; // BIGINT stored in ore
  enabled: boolean;
  period: string;
  icon: string | null; // Custom emoji/icon for the category
  created_at: string;
  updated_at: string;
}

export type BudgetPeriod = "monthly" | "weekly" | "yearly";

/**
 * React Query hook for budget CRUD operations.
 *
 * @param filters - Filter parameters including groupId, optional period, and enabledOnly
 * @returns Budget data and mutation functions
 *
 * @example
 * ```tsx
 * const { budgets, saveBudget, deleteBudget } = useBudgets({
 *   groupId: currentGroup.id,
 *   period: 'monthly',
 *   enabledOnly: true,
 * });
 * ```
 */
export function useBudgets(filters: BudgetFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching budgets with filters
  const query = useQuery({
    queryKey: queryKeys.budgets.list(filters),
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Build Supabase query with filters
      let query = supabase
        .from("budgets")
        .select("*")
        .eq("group_id", filters.groupId)
        .order("category", { ascending: true });

      // Apply period filter if provided
      if (filters.period) {
        query = query.eq("period", filters.period);
      }

      // Apply enabled filter if requested
      if (filters.enabledOnly) {
        query = query.eq("enabled", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching budgets:", error);
        throw error;
      }

      return (data || []) as Budget[];
    },
    enabled: !!filters.groupId && !!user,
    staleTime: STALE_TIME_FREQUENT,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation: Save budget (upsert - handles both create and update for same category)
  const saveMutation = useMutation({
    mutationFn: async (budget: {
      group_id: string;
      category: string;
      amount: number;
      enabled?: boolean;
      period?: string;
      icon?: string | null;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const insertData: TablesInsert<"budgets"> = {
        group_id: budget.group_id,
        category: budget.category,
        amount: budget.amount,
        enabled: budget.enabled ?? true,
        period: budget.period ?? "monthly",
        icon: budget.icon,
      };

      const { data, error } = await supabase
        .from("budgets")
        .upsert(insertData, { onConflict: "group_id,category,period" })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget sparad!");
    },
    onError: (error) => {
      handleDatabaseError(error, "Kunde inte spara budget", {
        operation: "saveBudget",
      });
    },
  });

  // Mutation: Update budget by id
  const updateMutation = useMutation({
    mutationFn: async ({
      budgetId,
      updates,
    }: {
      budgetId: string;
      updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      // Build update payload
      const dbUpdates: TablesUpdate<"budgets"> = {
        amount: updates.amount,
        category: updates.category,
        enabled: updates.enabled,
        period: updates.period,
        icon: updates.icon,
      };

      // Remove undefined fields to avoid overwriting with null
      const cleanUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([_, v]) => v !== undefined)
      ) as TablesUpdate<"budgets">;

      const { error } = await supabase
        .from("budgets")
        .update(cleanUpdates)
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget uppdaterad!");
    },
    onError: (error: unknown) => {
      handleDatabaseError(error, "Kunde inte uppdatera budget", {
        operation: "updateBudget",
      });
    },
  });

  // Mutation: Delete budget by id
  const deleteMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.lists() });
      toast.success("Budget borttagen!");
    },
    onError: (error: unknown) => {
      handleDatabaseError(error, "Kunde inte ta bort budget", {
        operation: "deleteBudget",
      });
    },
  });

  return {
    budgets: query.data ?? [],
    loading: query.isLoading,
    saveBudget: saveMutation.mutateAsync,
    updateBudget: async (
      budgetId: string,
      updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>
    ) => {
      await updateMutation.mutateAsync({ budgetId, updates });
    },
    deleteBudget: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
