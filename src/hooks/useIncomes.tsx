import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { queryKeys } from "./queries/queryKeys";
import type { IncomeFilters } from "./queries/types";
import type { Income, IncomeInput, IncomeType, IncomeRepeat } from "@/lib/types";

// Re-export types for backwards compatibility
export type { Income, IncomeInput, IncomeType, IncomeRepeat } from "@/lib/types";

// Internal type for database row casting
interface IncomeRow {
  id: string;
  group_id: string;
  amount: number;
  recipient: string;
  type: string;
  note: string | null;
  date: string;
  repeat: string;
  included_in_split: boolean;
  created_at: string;
  updated_at: string;
}

export function useIncomes(filters: IncomeFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching incomes with filters
  const query = useQuery({
    queryKey: queryKeys.incomes.list(filters),
    queryFn: async () => {
      if (!user) {
        return [];
      }

      let query = supabase
        .from("incomes")
        .select("*")
        .eq("group_id", filters.groupId)
        .order("date", { ascending: false });

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte("date", filters.dateRange.start.toISOString().split("T")[0])
          .lte("date", filters.dateRange.end.toISOString().split("T")[0]);
      }

      // Apply member filter (recipient field for incomes)
      if (filters.memberIds && filters.memberIds.length > 0) {
        query = query.in("recipient", filters.memberIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching incomes:", error);
        throw error;
      }

      // Cast the database response to our Income type
      const typedIncomes: Income[] = ((data as IncomeRow[]) || []).map((row) => ({
        ...row,
        type: row.type as IncomeType,
        repeat: row.repeat as IncomeRepeat,
      }));

      return typedIncomes;
    },
    enabled: !!filters.groupId && !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation: Add single income
  const addMutation = useMutation({
    mutationFn: async (income: IncomeInput) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      const { data, error } = await supabase
        .from("incomes")
        .insert({
          group_id: income.group_id,
          amount: income.amount,
          recipient: income.recipient,
          type: income.type,
          note: income.note || null,
          date: income.date,
          repeat: income.repeat || "none",
          included_in_split: income.included_in_split ?? true,
        })
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

      // Cast to our typed Income interface
      const row = data as IncomeRow;
      const typedIncome: Income = {
        ...row,
        type: row.type as IncomeType,
        repeat: row.repeat as IncomeRepeat,
      };

      return typedIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomes.lists() });
      toast.success("Inkomst tillagd!");
    },
    onError: (error) => {
      console.error("Error adding income:", error);
      toast.error("Kunde inte lägga till inkomst");
    },
  });

  // Mutation: Add multiple incomes (batch)
  const addIncomesMutation = useMutation({
    mutationFn: async (incomesData: IncomeInput[]) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      if (incomesData.length === 0) {
        return [];
      }

      // Batch insert all incomes in a single query
      const insertData = incomesData.map((income) => ({
        group_id: income.group_id,
        amount: income.amount,
        recipient: income.recipient,
        type: income.type,
        note: income.note || null,
        date: income.date,
        repeat: income.repeat || "none",
        included_in_split: income.included_in_split ?? true,
      }));

      const { data, error } = await supabase.from("incomes").insert(insertData).select();

      if (error) {
        console.error("Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      // Cast to our typed Income interface
      const typedIncomes: Income[] = ((data as IncomeRow[]) || []).map((row) => ({
        ...row,
        type: row.type as IncomeType,
        repeat: row.repeat as IncomeRepeat,
      }));

      return typedIncomes;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomes.lists() });
      toast.success(`${data.length} inkomster tillagda!`);
    },
    onError: (error) => {
      console.error("Error adding incomes:", error);
      toast.error("Kunde inte lägga till inkomster");
    },
  });

  // Mutation: Update income
  const updateMutation = useMutation({
    mutationFn: async ({
      incomeId,
      updates,
    }: {
      incomeId: string;
      updates: Partial<Omit<Income, "id" | "created_at" | "updated_at">>;
    }) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      // First, verify the income exists and user has permission
      const income = query.data?.find((i) => i.id === incomeId);
      if (!income) {
        throw new Error("Inkomsten hittades inte");
      }

      // No client-side security check needed - RLS handles access control
      // Any group member can update incomes in their group

      // Additional check: Verify income belongs to current group if groupId is set
      if (filters.groupId && income.group_id !== filters.groupId) {
        throw new Error("Inkomsten tillhör inte det valda hushållet");
      }

      const { error } = await supabase.from("incomes").update(updates).eq("id", incomeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomes.lists() });
      toast.success("Inkomst uppdaterad!");
    },
    onError: (error: any) => {
      console.error("Error updating income:", error);
      toast.error(error.message || "Kunde inte uppdatera inkomst");
    },
  });

  // Mutation: Delete income with undo
  const deleteMutation = useMutation({
    mutationFn: async (incomeId: string) => {
      if (!user) {
        throw new Error("Du måste vara inloggad");
      }

      // Find the income to delete (for potential undo)
      const incomeToDelete = query.data?.find((i) => i.id === incomeId);
      if (!incomeToDelete) {
        throw new Error("Inkomsten hittades inte");
      }

      // No client-side security check needed - RLS handles access control
      // Any group member can delete incomes in their group

      // Additional check: Verify income belongs to current group if groupId is set
      if (filters.groupId && incomeToDelete.group_id !== filters.groupId) {
        throw new Error("Inkomsten tillhör inte det valda hushållet");
      }

      // Delete from database - RLS handles access control
      const { error } = await supabase
        .from("incomes")
        .delete()
        .eq("id", incomeId); // RLS handles access control

      if (error) throw error;

      return incomeToDelete;
    },
    onSuccess: (incomeToDelete) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incomes.lists() });

      // Show toast with undo action
      toast.success("Inkomst borttagen!", {
        duration: 5000,
        action: {
          label: "Ångra",
          onClick: async () => {
            try {
              // Restore the income
              const { error: restoreError } = await supabase.from("incomes").insert({
                id: incomeToDelete.id,
                group_id: incomeToDelete.group_id,
                amount: incomeToDelete.amount,
                recipient: incomeToDelete.recipient,
                type: incomeToDelete.type,
                note: incomeToDelete.note,
                date: incomeToDelete.date,
                repeat: incomeToDelete.repeat,
                included_in_split: incomeToDelete.included_in_split,
              });

              if (restoreError) throw restoreError;

              queryClient.invalidateQueries({ queryKey: queryKeys.incomes.lists() });
              toast.success("Inkomst återställd!");
            } catch (restoreError) {
              console.error("Error restoring income:", restoreError);
              toast.error("Kunde inte återställa inkomst");
            }
          },
        },
      });
    },
    onError: (error: any) => {
      console.error("Error deleting income:", error);
      toast.error(error.message || "Kunde inte ta bort inkomst");
    },
  });

  return {
    incomes: query.data ?? [],
    loading: query.isLoading,
    addIncome: addMutation.mutateAsync,
    addIncomes: addIncomesMutation.mutateAsync,
    updateIncome: async (
      incomeId: string,
      updates: Partial<Omit<Income, "id" | "created_at" | "updated_at">>
    ) => {
      await updateMutation.mutateAsync({ incomeId, updates });
    },
    deleteIncome: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
