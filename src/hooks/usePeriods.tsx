import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError } from "@/lib/errorHandling";
import type { Period } from "@/lib/types";

const SELECTED_PERIOD_KEY = "selected_period_id";

/**
 * Format a default period name from a date (e.g. "April 2026").
 */
function defaultPeriodName(date: Date): string {
  return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase());
}

/**
 * Check if a date string (YYYY-MM-DD) falls within a period's date range.
 */
export function isDateInPeriod(dateStr: string, period: Period): boolean {
  const d = dateStr.slice(0, 10); // normalize to YYYY-MM-DD
  if (d < period.start_date) return false;
  if (period.end_date && d > period.end_date) return false;
  return true;
}

/**
 * Check if a transaction was added after the period was closed
 * or after the latest settlement in that period.
 */
export function isAddedAfterCloseOrSettlement(
  createdAt: string,
  period: Period,
  latestSettlementAt?: string | null,
): boolean {
  // Added after period was closed
  if (period.is_closed && period.closed_at && createdAt > period.closed_at) {
    return true;
  }
  // Added after the latest settlement in this period
  if (latestSettlementAt && createdAt > latestSettlementAt) {
    return true;
  }
  return false;
}

export function usePeriods(groupId?: string) {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriodState] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPeriods = useCallback(async () => {
    if (!user || !groupId) {
      setPeriods([]);
      setSelectedPeriodState(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("periods")
        .select("*")
        .eq("group_id", groupId)
        .order("start_date", { ascending: false });

      if (error) throw error;

      const fetched: Period[] = data || [];
      setPeriods(fetched);

      // Restore selection or default to latest open period
      const savedId = localStorage.getItem(SELECTED_PERIOD_KEY);
      let selected = fetched.find(p => p.id === savedId);
      if (!selected) {
        // Prefer the latest open period, otherwise the latest period
        selected = fetched.find(p => !p.is_closed) || fetched[0] || null;
      }

      if (selected) {
        setSelectedPeriodState(selected);
        localStorage.setItem(SELECTED_PERIOD_KEY, selected.id);
      } else {
        setSelectedPeriodState(null);
        localStorage.removeItem(SELECTED_PERIOD_KEY);
      }
    } catch (error) {
      handleDatabaseError(error, "Kunde inte hämta perioder", {
        operation: "fetchPeriods",
        groupId,
      });
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const selectPeriod = useCallback((periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setSelectedPeriodState(period);
      localStorage.setItem(SELECTED_PERIOD_KEY, periodId);
    }
  }, [periods]);

  /**
   * Create a new period. Automatically sets end_date on the previous open-ended period.
   */
  const createPeriod = useCallback(async (name?: string, startDate?: string) => {
    if (!user || !groupId) return null;

    const start = startDate || new Date().toISOString().split("T")[0];
    const periodName = name || defaultPeriodName(new Date(start + "T12:00:00"));

    try {
      // Close the end_date of the previous open-ended period
      const prevOpen = periods.find(p => !p.end_date);
      if (prevOpen) {
        const prevEnd = new Date(start + "T12:00:00");
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevEndStr = prevEnd.toISOString().split("T")[0];

        await supabase
          .from("periods")
          .update({ end_date: prevEndStr })
          .eq("id", prevOpen.id);
      }

      const { data, error } = await supabase
        .from("periods")
        .insert({
          group_id: groupId,
          name: periodName,
          start_date: start,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPeriods();

      // Select the new period
      if (data) {
        setSelectedPeriodState(data);
        localStorage.setItem(SELECTED_PERIOD_KEY, data.id);
      }

      toast.success("Ny period skapad");
      return data;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte skapa period", {
        operation: "createPeriod",
        groupId,
      });
      return null;
    }
  }, [user, groupId, periods, fetchPeriods]);

  /**
   * Close a period (mark as closed, set end_date to today if not set).
   */
  const closePeriod = useCallback(async (periodId: string) => {
    if (!user) return false;

    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) return false;

      const updates: Record<string, unknown> = {
        is_closed: true,
        closed_at: new Date().toISOString(),
      };

      // If no end_date, set to today
      if (!period.end_date) {
        updates.end_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("periods")
        .update(updates)
        .eq("id", periodId);

      if (error) throw error;

      await fetchPeriods();
      toast.success("Period stängd");
      return true;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte stänga period", {
        operation: "closePeriod",
        periodId,
      });
      return false;
    }
  }, [user, periods, fetchPeriods]);

  /**
   * Reopen a closed period.
   */
  const reopenPeriod = useCallback(async (periodId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("periods")
        .update({ is_closed: false, closed_at: null })
        .eq("id", periodId);

      if (error) throw error;

      await fetchPeriods();
      toast.success("Period öppnad igen");
      return true;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte öppna period", {
        operation: "reopenPeriod",
        periodId,
      });
      return false;
    }
  }, [user, fetchPeriods]);

  /**
   * Ensure at least one period exists for the group.
   * Called when switching to a group that has no periods yet.
   */
  const ensurePeriodExists = useCallback(async () => {
    if (!user || !groupId) return;

    // Check if already have periods (from state or fetch)
    if (periods.length > 0) return;

    // Double-check from DB
    const { data } = await supabase
      .from("periods")
      .select("id")
      .eq("group_id", groupId)
      .limit(1);

    if (data && data.length > 0) return;

    // Create first period starting from 1st of current month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = firstOfMonth.toISOString().split("T")[0];
    const name = defaultPeriodName(now);

    await supabase
      .from("periods")
      .insert({
        group_id: groupId,
        name,
        start_date: startDate,
        created_by: user.id,
      });

    await fetchPeriods();
  }, [user, groupId, periods.length, fetchPeriods]);

  return {
    periods,
    selectedPeriod,
    selectPeriod,
    loading,
    createPeriod,
    closePeriod,
    reopenPeriod,
    ensurePeriodExists,
    refetch: fetchPeriods,
  };
}
