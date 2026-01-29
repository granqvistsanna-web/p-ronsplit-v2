import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError, handleAuthError } from "@/lib/errorHandling";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Settlement } from "@/lib/types";
import { toOre, toKronor, oreFromDb } from "@/lib/currency";

// Re-export type for backwards compatibility
export type { Settlement } from "@/lib/types";

/**
 * Format a date as Swedish month + year (e.g., "Januari 2024")
 * Uses date-fns for consistent cross-browser formatting
 */
function formatSwedishMonth(date: Date): string {
  const formatted = format(date, "MMMM yyyy", { locale: sv });
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function useSettlements(groupId?: string) {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = useCallback(async () => {
    let isMounted = true;

    if (!user) {
      setSettlements([]);
      setLoading(false);
      return () => { isMounted = false; };
    }

    try {
      let query = supabase.from("settlements").select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;

      // Convert amounts from öre to kronor (with null-safety)
      const settlementsInKronor = (data || []).map((s) => ({
        ...s,
        amount: s.amount != null ? toKronor(oreFromDb(s.amount)) : 0,
      }));
      if (isMounted) {
        setSettlements(settlementsInKronor);
      }
    } catch (error) {
      handleDatabaseError(error, "Kunde inte hämta avräkningar", {
        operation: "fetchSettlements",
        groupId,
      });
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => { isMounted = false; };
  }, [user, groupId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const run = async () => {
      cleanup = await fetchSettlements();
    };
    run();

    return () => {
      cleanup?.();
    };
  }, [fetchSettlements]);

  const addSettlement = async (settlement: {
    group_id: string;
    from_user: string;
    to_user: string;
    amount: number;
    date?: string;
  }) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "addSettlement",
      });
      return null;
    }

    const settlementDate = settlement.date || new Date().toISOString().split("T")[0];
    const dateObj = new Date(settlementDate);
    const month = formatSwedishMonth(dateObj);

    try {
      // Convert amount from kronor to öre for database storage
      const amountInOre = toOre(settlement.amount);

      const { data, error } = await supabase
        .from("settlements")
        .insert({
          group_id: settlement.group_id,
          from_user: settlement.from_user,
          to_user: settlement.to_user,
          amount: amountInOre,
          date: settlementDate,
          month,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSettlements();
      return data;
    } catch (error) {
      console.error("Error adding settlement:", error);
      // Don't show toast here - let the caller handle error feedback
      throw error;
    }
  };

  const updateSettlement = async (
    settlementId: string,
    updates: {
      from_user?: string;
      to_user?: string;
      amount?: number;
      date?: string;
    }
  ) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "updateSettlement",
      });
      return null;
    }

    try {
      // Recalculate month if date is updated
      let month: string | undefined;
      if (updates.date) {
        month = formatSwedishMonth(new Date(updates.date));
      }

      // Convert amount to öre if it's being updated
      const updateData = {
        ...updates,
        ...(updates.amount !== undefined ? { amount: toOre(updates.amount) } : {}),
        ...(month ? { month } : {}),
      };

      const { data, error } = await supabase
        .from("settlements")
        .update(updateData)
        .eq("id", settlementId)
        .select()
        .single();

      if (error) throw error;

      await fetchSettlements();
      toast.success("Avräkning uppdaterad");
      return data;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte uppdatera avräkning", {
        operation: "updateSettlement",
        settlementId,
      });
      return null;
    }
  };

  const deleteSettlement = async (settlementId: string) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "deleteSettlement",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("settlements")
        .delete()
        .eq("id", settlementId);

      if (error) throw error;

      await fetchSettlements();
      toast.success("Avräkning borttagen");
      return true;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte ta bort avräkning", {
        operation: "deleteSettlement",
        settlementId,
      });
      return false;
    }
  };

  return {
    settlements,
    loading,
    addSettlement,
    updateSettlement,
    deleteSettlement,
    refetch: fetchSettlements,
  };
}
