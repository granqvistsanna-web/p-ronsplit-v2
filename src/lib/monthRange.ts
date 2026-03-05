/**
 * Compute custom month boundaries based on a configurable start day.
 *
 * Example: monthStartDay = 25
 *   "March 2025" → 25 Feb 2025 – 24 Mar 2025
 *
 * When monthStartDay = 1 this returns the normal calendar month.
 */
export interface MonthRange {
  start: Date; // inclusive, 00:00:00
  end: Date;   // inclusive, 23:59:59.999
}

export function getMonthRange(
  year: number,
  month: number, // 1-12
  monthStartDay: number = 1
): MonthRange {
  if (monthStartDay === 1) {
    // Standard calendar month
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
    return { start, end };
  }

  // Custom start day: month N runs from day X of month N-1 to day X-1 of month N
  // "March" with startDay 25 → Feb 25 – Mar 24
  const prevMonth = month - 2; // 0-indexed, may be -1 for January
  const start = new Date(year, prevMonth, monthStartDay, 0, 0, 0, 0);
  const end = new Date(year, month - 1, monthStartDay - 1, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Check if a date string (YYYY-MM-DD) falls within the given month range.
 */
export function isDateInMonthRange(dateStr: string, range: MonthRange): boolean {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
  return d >= range.start && d <= range.end;
}
