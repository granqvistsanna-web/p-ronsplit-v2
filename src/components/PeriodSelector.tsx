import { ChevronLeft, ChevronRight } from "lucide-react";
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
  // Periods are newest-first, so "prev" (older) = higher index, "next" (newer) = lower index
  const currentIndex = periods.findIndex((p) => p.id === selectedPeriod?.id);
  const hasPrev = currentIndex < periods.length - 1;
  const hasNext = currentIndex > 0;

  const goPrev = () => {
    if (hasPrev) onSelectPeriod(periods[currentIndex + 1].id);
  };

  const goNext = () => {
    if (hasNext) onSelectPeriod(periods[currentIndex - 1].id);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={goPrev}
        disabled={!hasPrev}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          hasPrev
            ? "text-foreground hover:bg-secondary/60 cursor-pointer"
            : "text-muted-foreground/30 cursor-default"
        )}
        aria-label="Föregående period"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex flex-col items-center leading-tight min-w-[140px]">
        {selectedPeriod ? (
          <>
            <span className="text-sm font-medium text-foreground">
              {selectedPeriod.name}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDateRange(selectedPeriod.start_date, selectedPeriod.end_date)}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Ingen period</span>
        )}
      </div>

      <button
        onClick={goNext}
        disabled={!hasNext}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          hasNext
            ? "text-foreground hover:bg-secondary/60 cursor-pointer"
            : "text-muted-foreground/30 cursor-default"
        )}
        aria-label="Nästa period"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
