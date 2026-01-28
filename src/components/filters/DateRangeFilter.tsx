"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_PRESETS, type DatePreset } from "@/lib/datePresets";

export interface DateRangeFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  disabled?: boolean;
}

export function DateRangeFilter({
  value,
  onChange,
  disabled = false,
}: DateRangeFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as DatePreset)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-10 min-w-[180px]"
        aria-label="Välj tidsperiod"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(DATE_PRESETS).map(([preset, label]) => (
          <SelectItem key={preset} value={preset}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
