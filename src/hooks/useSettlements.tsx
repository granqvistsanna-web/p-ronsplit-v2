import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export function useSettlements(groupId?: string) {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = useCallback(async () => {
    if (!user) {
      setSettlements([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from("settlements").select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;

      setSettlements(data || []);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast.error("Kunde inte hämta avräkningar");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const addSettlement = async (settlement: {
    group_id: string;
    from_user: string;
    to_user: string;
    amount: number;
    date?: string;
  }) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return null;
    }

    const settlementDate = settlement.date || new Date().toISOString().split("T")[0];
    const dateObj = new Date(settlementDate);
    const month = dateObj.toLocaleDateString("sv-SE", {
      month: "long",
      year: "numeric",
    });

    try {
      const { data, error } = await supabase
        .from("settlements")
        .insert({
          group_id: settlement.group_id,
          from_user: settlement.from_user,
          to_user: settlement.to_user,
          amount: settlement.amount,
          date: settlementDate,
          month: month.charAt(0).toUpperCase() + month.slice(1),
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSettlements();
      return data;
    } catch (error) {
      console.error("Error adding settlement:", error);
      toast.error("Kunde inte registrera avräkning");
      return null;
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
      toast.error("Du måste vara inloggad");
      return null;
    }

    try {
      // Recalculate month if date is updated
      let month: string | undefined;
      if (updates.date) {
        const dateObj = new Date(updates.date);
        const monthStr = dateObj.toLocaleDateString("sv-SE", {
          month: "long",
          year: "numeric",
        });
        month = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      }

      const { data, error } = await supabase
        .from("settlements")
        .update({
          ...updates,
          ...(month ? { month } : {}),
        })
        .eq("id", settlementId)
        .select()
        .single();

      if (error) throw error;

      await fetchSettlements();
      toast.success("Avräkning uppdaterad");
      return data;
    } catch (error) {
      console.error("Error updating settlement:", error);
      toast.error("Kunde inte uppdatera avräkning");
      return null;
    }
  };

  const deleteSettlement = async (settlementId: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
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
      console.error("Error deleting settlement:", error);
      toast.error("Kunde inte ta bort avräkning");
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
