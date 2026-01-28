"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilterParams } from "@/hooks/useFilterParams";
import { DateRangeFilter } from "./DateRangeFilter";
import { MemberFilter } from "./MemberFilter";
import type { GroupMember } from "@/lib/types";

export interface FilterBarProps {
  members: GroupMember[];
  loading?: boolean;
}

export function FilterBar({ members, loading = false }: FilterBarProps) {
  const {
    datePreset,
    setDatePreset,
    memberIds,
    setMemberIds,
    hasActiveFilters,
    resetFilters,
  } = useFilterParams();

  return (
    <div
      role="group"
      aria-label="Analysfilter"
      className="flex flex-wrap items-center gap-3"
    >
      <DateRangeFilter
        value={datePreset}
        onChange={setDatePreset}
        disabled={loading}
      />
      <MemberFilter
        members={members}
        selectedIds={memberIds}
        onSelectionChange={setMemberIds}
        disabled={loading}
      />
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-10 text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Återställ
        </Button>
      )}
    </div>
  );
}
