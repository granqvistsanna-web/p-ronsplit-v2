import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfYear,
  startOfDay,
  endOfDay,
} from 'date-fns';

export type DatePreset =
  | 'this-month'
  | 'last-month'
  | 'last-30-days'
  | 'ytd'
  | 'last-3-months'
  | 'last-6-months'
  | 'last-12-months';

export const DEFAULT_DATE_PRESET: DatePreset = 'this-month';

export const DATE_PRESETS: Record<DatePreset, string> = {
  'this-month': 'Denna månad',
  'last-month': 'Förra månaden',
  'last-30-days': 'Senaste 30 dagarna',
  'ytd': 'Hittills i år',
  'last-3-months': 'Senaste 3 månaderna',
  'last-6-months': 'Senaste 6 månaderna',
  'last-12-months': 'Senaste 12 månaderna',
};

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(preset: string): DateRange {
  const now = new Date();

  switch (preset) {
    case 'this-month':
      return {
        start: startOfDay(startOfMonth(now)),
        end: endOfDay(endOfMonth(now)),
      };

    case 'last-month': {
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfDay(startOfMonth(lastMonth)),
        end: endOfDay(endOfMonth(lastMonth)),
      };
    }

    case 'last-30-days':
      return {
        start: startOfDay(subDays(now, 30)),
        end: endOfDay(now),
      };

    case 'ytd':
      return {
        start: startOfDay(startOfYear(now)),
        end: endOfDay(now),
      };

    case 'last-3-months': {
      const threeMonthsAgo = subMonths(now, 3);
      return {
        start: startOfDay(startOfMonth(threeMonthsAgo)),
        end: endOfDay(now),
      };
    }

    case 'last-6-months': {
      const sixMonthsAgo = subMonths(now, 6);
      return {
        start: startOfDay(startOfMonth(sixMonthsAgo)),
        end: endOfDay(now),
      };
    }

    case 'last-12-months': {
      const twelveMonthsAgo = subMonths(now, 12);
      return {
        start: startOfDay(startOfMonth(twelveMonthsAgo)),
        end: endOfDay(now),
      };
    }

    default:
      console.warn(
        `Unknown date preset "${preset}", falling back to "${DEFAULT_DATE_PRESET}"`
      );
      return getDateRange(DEFAULT_DATE_PRESET);
  }
}
