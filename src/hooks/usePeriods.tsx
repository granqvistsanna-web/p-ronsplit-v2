import { useState, useCallback, useMemo } from "react";
import type { ComputedPeriod } from "@/lib/periodUtils";
import { computePeriodForDate, computePeriodsRange } from "@/lib/periodUtils";

// Re-export for convenience
export { isDateInPeriod } from "@/lib/periodUtils";
export type { ComputedPeriod } from "@/lib/periodUtils";

const SELECTED_PERIOD_KEY = "selected_period_id";

/**
 * Format today as YYYY-MM-DD.
 */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface UsePeriodsDeps {
  /** All transaction dates (YYYY-MM-DD) to determine range of periods to show */
  transactionDates: string[];
  /** Group's configured month start day (1-28) */
  monthStartDay?: number;
}

export function usePeriods({ transactionDates, monthStartDay = 1 }: UsePeriodsDeps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_PERIOD_KEY)
  );

  // Compute all periods covering transaction dates + current date
  const periods = useMemo(() => {
    const today = todayStr();
    const allDates = [...transactionDates.filter(Boolean), today];
    if (allDates.length === 0) return [];

    allDates.sort();
    const earliest = allDates[0];
    const latest = allDates[allDates.length - 1] > today ? allDates[allDates.length - 1] : today;

    return computePeriodsRange(earliest, latest, monthStartDay);
  }, [transactionDates, monthStartDay]);

  // Resolve selected period
  const selectedPeriod = useMemo(() => {
    if (periods.length === 0) return null;

    // Try to restore saved selection
    if (selectedPeriodId) {
      const saved = periods.find(p => p.id === selectedPeriodId);
      if (saved) return saved;
    }

    // Default to current period (the one containing today)
    const today = todayStr();
    const current = periods.find(p => p.start_date <= today && p.end_date >= today);
    return current || periods[0];
  }, [periods, selectedPeriodId]);

  const selectPeriod = useCallback((periodId: string) => {
    setSelectedPeriodId(periodId);
    localStorage.setItem(SELECTED_PERIOD_KEY, periodId);
  }, []);

  return {
    periods,
    selectedPeriod,
    selectPeriod,
  };
}
