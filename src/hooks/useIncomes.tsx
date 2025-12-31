import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type IncomeType = "salary" | "bonus" | "benefit" | "fkassa" | "bidrag" | "other";
export type IncomeRepeat = "none" | "monthly";

export interface Income {
  id: string;
  group_id: string;
  amount: number; // Amount in cents
  recipient: string;
  type: IncomeType;
  note: string | null;
  date: string;
  repeat: IncomeRepeat;
  included_in_split: boolean;
  created_at: string;
  updated_at: string;
}

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

// Database row type (before casting to our Income interface)
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

export function useIncomes(groupId?: string) {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomes = useCallback(async () => {
    if (!user) {
      setIncomes([]);
      setLoading(false);
      return;
    }

    try {
      // Use type assertion since types may not be regenerated yet
      let query = (supabase.from("incomes" as any) as any).select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;

      // Cast the database response to our Income type
      const typedIncomes: Income[] = ((data as IncomeRow[]) || []).map((row) => ({
        ...row,
        type: row.type as IncomeType,
        repeat: row.repeat as IncomeRepeat,
      }));

      setIncomes(typedIncomes);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      // Don't show error toast for empty results - only log to console
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const addIncome = async (income: IncomeInput): Promise<Income | null> => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return null;
    }

    try {
      const { data, error } = await (supabase.from("incomes" as any) as any)
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

      await fetchIncomes();
      toast.success("Inkomst tillagd!");

      // Cast to our typed Income interface
      const row = data as IncomeRow;
      const typedIncome: Income = {
        ...row,
        type: row.type as IncomeType,
        repeat: row.repeat as IncomeRepeat,
      };

      return typedIncome;
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Kunde inte lägga till inkomst");
      return null;
    }
  };

  const updateIncome = async (
    incomeId: string,
    updates: Partial<Omit<Income, "id" | "created_at" | "updated_at">>
  ) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    try {
      // First, verify the user owns this income
      const income = incomes.find(i => i.id === incomeId);
      if (!income) {
        toast.error("Inkomsten hittades inte");
        return;
      }

      const { error } = await (supabase.from("incomes" as any) as any)
        .update(updates)
        .eq("id", incomeId);

      if (error) throw error;

      await fetchIncomes();
      toast.success("Inkomst uppdaterad!");
    } catch (error) {
      console.error("Error updating income:", error);
      toast.error("Kunde inte uppdatera inkomst");
    }
  };

  const deleteIncome = async (incomeId: string) => {
    try {
      // Find the income to delete (for potential undo)
      const incomeToDelete = incomes.find((i) => i.id === incomeId);
      if (!incomeToDelete) {
        toast.error("Inkomsten hittades inte");
        return;
      }

      // Delete from database
      const { error } = await (supabase.from("incomes" as any) as any)
        .delete()
        .eq("id", incomeId);

      if (error) throw error;

      await fetchIncomes();

      // Show toast with undo action
      toast.success("Inkomst borttagen!", {
        duration: 5000,
        action: {
          label: "Ångra",
          onClick: async () => {
            try {
              // Restore the income
              const { error: restoreError } = await (supabase.from("incomes" as any) as any)
                .insert({
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

              await fetchIncomes();
              toast.success("Inkomst återställd!");
            } catch (restoreError) {
              console.error("Error restoring income:", restoreError);
              toast.error("Kunde inte återställa inkomst");
            }
          },
        },
      });
    } catch (error) {
      console.error("Error deleting income:", error);
      toast.error("Kunde inte ta bort inkomst");
    }
  };

  return {
    incomes,
    loading,
    addIncome,
    updateIncome,
    deleteIncome,
    refetch: fetchIncomes,
  };
}
