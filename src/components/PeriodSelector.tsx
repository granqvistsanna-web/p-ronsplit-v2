import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComputedPeriod } from "@/lib/periodUtils";

/** Format a short date range like "6 apr – 5 maj" */
function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

interface PeriodSelectorProps {
  periods: ComputedPeriod[];
  selectedPeriod: ComputedPeriod | null;
  onSelectPeriod: (periodId: string) => void;
}

export function PeriodSelector({
  periods,
  selectedPeriod,
  onSelectPeriod,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              "text-foreground hover:bg-secondary/60 cursor-pointer"
            )}
          >
            {selectedPeriod ? (
              <span className="flex flex-col items-start leading-tight">
                <span>{selectedPeriod.name}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {formatDateRange(selectedPeriod.start_date, selectedPeriod.end_date)}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Välj period</span>
            )}
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[180px]">
          {periods.map((period) => (
            <DropdownMenuItem
              key={period.id}
              onClick={() => onSelectPeriod(period.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex flex-col leading-tight">
                <span>{period.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateRange(period.start_date, period.end_date)}
                </span>
              </span>
              {period.id === selectedPeriod?.id && <Check size={14} />}
            </DropdownMenuItem>
          ))}
          {periods.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">Inga perioder</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
