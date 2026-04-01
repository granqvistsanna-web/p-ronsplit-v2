/**
 * Computed period utilities.
 * Periods are derived from a group's month_start_day setting — no database storage needed.
 */

export interface ComputedPeriod {
  /** Deterministic id based on start date, e.g. "2026-04-06" */
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

/** Swedish month names with uppercase first letter */
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

/** Format YYYY-MM-DD from a Date */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get the period start date for a given month/year.
 * If monthStartDay > days in month, clamps to last day.
 */
function periodStart(year: number, month: number, startDay: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(startDay, daysInMonth);
  return new Date(year, month, day);
}

/**
 * Compute which period a date belongs to.
 */
export function computePeriodForDate(dateStr: string, monthStartDay: number): ComputedPeriod {
  const d = new Date(dateStr + "T12:00:00");
  let year = d.getFullYear();
  let month = d.getMonth();

  // A period named "April" starts on startDay of April.
  // If the date is before startDay of its calendar month, it belongs to previous month's period.
  const startOfThisMonth = periodStart(year, month, monthStartDay);
  if (d < startOfThisMonth) {
    // Belongs to previous month's period
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  const start = periodStart(year, month, monthStartDay);

  // End date = day before next period starts
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  const nextStart = periodStart(nextYear, nextMonth, monthStartDay);
  const end = new Date(nextStart);
  end.setDate(end.getDate() - 1);

  const name = `${MONTH_NAMES[month]} ${year}`;

  return {
    id: toDateStr(start),
    name,
    start_date: toDateStr(start),
    end_date: toDateStr(end),
  };
}

/**
 * Compute all periods that cover a date range.
 * Returns periods sorted newest-first.
 */
export function computePeriodsRange(
  fromDate: string,
  toDate: string,
  monthStartDay: number,
): ComputedPeriod[] {
  const periods: ComputedPeriod[] = [];
  const seen = new Set<string>();

  // Start from the period containing fromDate
  let current = computePeriodForDate(fromDate, monthStartDay);
  const endLimit = toDate;

  while (current.start_date <= endLimit) {
    if (!seen.has(current.id)) {
      seen.add(current.id);
      periods.push(current);
    }

    // Move to next period
    const nextStart = new Date(current.end_date + "T12:00:00");
    nextStart.setDate(nextStart.getDate() + 1);
    current = computePeriodForDate(toDateStr(nextStart), monthStartDay);

    // Safety: break if we somehow loop
    if (seen.has(current.id)) break;
  }

  // Newest first
  return periods.reverse();
}

/**
 * Check if a date string (YYYY-MM-DD) falls within a period's date range.
 */
export function isDateInPeriod(dateStr: string, period: ComputedPeriod): boolean {
  const d = dateStr.slice(0, 10);
  return d >= period.start_date && d <= period.end_date;
}
