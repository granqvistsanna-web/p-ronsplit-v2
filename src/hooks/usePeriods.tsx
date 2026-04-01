import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError } from "@/lib/errorHandling";
import type { Period } from "@/lib/types";

const SELECTED_PERIOD_KEY = "selected_period_id";

/**
 * Format a calendar-month period name (e.g. "April 2026").
 */
function monthName(date: Date): string {
  return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase());
}

/** Get first day of a month as YYYY-MM-DD */
function firstOfMonth(year: number, month: number): string {
  return new Date(year, month, 1).toISOString().split("T")[0];
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
  const creatingPeriod = useRef(false);
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
   * Create a new open-ended period for a given year/month (end_date = null).
   */
  const createPeriod = useCallback(async (year?: number, month?: number) => {
    if (!user || !groupId) return null;

    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth();

    const start = firstOfMonth(y, m);
    const name = monthName(new Date(y, m, 1));

    // Don't create duplicates
    const exists = periods.some(p => p.start_date === start);
    if (exists) return periods.find(p => p.start_date === start) || null;

    try {
      const { data, error } = await supabase
        .from("periods")
        .insert({
          group_id: groupId,
          name,
          start_date: start,
          end_date: null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPeriods();

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
   * Close a period (set end_date to today) and create next period starting tomorrow.
   */
  const closePeriod = useCallback(async (periodId: string) => {
    if (!user || !groupId) return false;

    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) return false;

      // Close the period: set end_date to today
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("periods")
        .update({
          is_closed: true,
          closed_at: new Date().toISOString(),
          end_date: today,
        })
        .eq("id", periodId);

      if (error) throw error;

      // Create next period starting from tomorrow with open end
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextStartDate = tomorrow.toISOString().split("T")[0];
      const nextName = monthName(tomorrow);

      const { data: newPeriod } = await supabase
        .from("periods")
        .insert({
          group_id: groupId,
          name: nextName,
          start_date: nextStartDate,
          end_date: null,
          created_by: user.id,
        })
        .select()
        .single();

      await fetchPeriods();

      // Auto-select the new period
      if (newPeriod) {
        setSelectedPeriodState(newPeriod);
        localStorage.setItem(SELECTED_PERIOD_KEY, newPeriod.id);
      }

      toast.success("Period stängd");
      return true;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte stänga period", {
        operation: "closePeriod",
        periodId,
      });
      return false;
    }
  }, [user, groupId, periods, fetchPeriods]);

  /**
   * Reopen a closed period.
   */
  const reopenPeriod = useCallback(async (periodId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("periods")
        .update({ is_closed: false, closed_at: null, end_date: null })
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
   * Creates current month as open-ended period if none exist.
   */
  const ensurePeriodExists = useCallback(async () => {
    if (!user || !groupId) return;
    if (creatingPeriod.current) return;

    if (periods.length > 0) return;

    // Double-check from DB
    const { data } = await supabase
      .from("periods")
      .select("id")
      .eq("group_id", groupId)
      .limit(1);

    if (data && data.length > 0) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    creatingPeriod.current = true;
    try {
      await supabase
        .from("periods")
        .insert({
          group_id: groupId,
          name: monthName(now),
          start_date: firstOfMonth(y, m),
          end_date: null,
          created_by: user.id,
        });

      await fetchPeriods();
    } finally {
      creatingPeriod.current = false;
    }
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
