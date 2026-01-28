import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getDateRange,
  DEFAULT_DATE_PRESET,
  type DatePreset,
  type DateRange,
} from '@/lib/datePresets';

export interface UseFilterParamsReturn {
  datePreset: DatePreset;
  dateRange: DateRange;
  setDatePreset: (preset: DatePreset) => void;
  memberIds: string[];
  setMemberIds: (ids: string[]) => void;
  hasActiveFilters: boolean;
  resetFilters: () => void;
}

export function useFilterParams(): UseFilterParamsReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read datePreset from ?range= URL param (default: DEFAULT_DATE_PRESET)
  const datePreset = (searchParams.get('range') as DatePreset) || DEFAULT_DATE_PRESET;

  // Read memberIds from ?members= URL param as comma-separated array
  const memberIds = useMemo(() => {
    const membersParam = searchParams.get('members');
    if (!membersParam) return [];
    return membersParam.split(',').filter(Boolean);
  }, [searchParams]);

  // Compute dateRange using useMemo
  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  // Set date preset with URL update using callback pattern
  const setDatePreset = useCallback(
    (preset: DatePreset) => {
      setSearchParams((prev) => {
        if (preset === DEFAULT_DATE_PRESET) {
          prev.delete('range');
        } else {
          prev.set('range', preset);
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  // Set member IDs with URL update
  const setMemberIds = useCallback(
    (ids: string[]) => {
      setSearchParams((prev) => {
        if (ids.length === 0) {
          prev.delete('members');
        } else {
          prev.set('members', ids.join(','));
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  // Check if any filters are active
  const hasActiveFilters = datePreset !== DEFAULT_DATE_PRESET || memberIds.length > 0;

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return {
    datePreset,
    dateRange,
    setDatePreset,
    memberIds,
    setMemberIds,
    hasActiveFilters,
    resetFilters,
  };
}
