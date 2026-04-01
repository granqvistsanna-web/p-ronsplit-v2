import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Check,
  Lock,
  LockOpen,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/types";

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriod: Period | null;
  onSelectPeriod: (periodId: string) => void;
  onClosePeriod: (periodId: string) => Promise<boolean>;
  onReopenPeriod: (periodId: string) => Promise<boolean>;
}

export function PeriodSelector({
  periods,
  selectedPeriod,
  onSelectPeriod,
  onClosePeriod,
  onReopenPeriod,
}: PeriodSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleClosePeriod = async () => {
    if (!selectedPeriod || selectedPeriod.is_closed) return;
    setLoading(true);
    try {
      await onClosePeriod(selectedPeriod.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenPeriod = async () => {
    if (!selectedPeriod || !selectedPeriod.is_closed) return;
    setLoading(true);
    try {
      await onReopenPeriod(selectedPeriod.id);
    } finally {
      setLoading(false);
    }
  };

  // Sort periods: open first, then by start_date descending
  const sortedPeriods = [...periods].sort((a, b) => {
    if (a.is_closed !== b.is_closed) return a.is_closed ? 1 : -1;
    return b.start_date.localeCompare(a.start_date);
  });

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Period selector dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              "text-foreground hover:bg-secondary/60 cursor-pointer"
            )}
          >
            {selectedPeriod ? (
              <>
                {selectedPeriod.is_closed && (
                  <Lock size={14} className="text-muted-foreground" />
                )}
                <span>{selectedPeriod.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Välj period</span>
            )}
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[180px]">
          {sortedPeriods.map((period) => (
            <DropdownMenuItem
              key={period.id}
              onClick={() => onSelectPeriod(period.id)}
              className="flex items-center justify-between gap-2"
            >
              <span
                className={cn(
                  period.is_closed && "text-muted-foreground"
                )}
              >
                {period.name}
              </span>
              {period.is_closed ? (
                <Lock size={14} className="text-muted-foreground" />
              ) : period.id === selectedPeriod?.id ? (
                <Check size={14} />
              ) : null}
            </DropdownMenuItem>
          ))}
          {periods.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">Inga perioder</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-secondary/80"
            disabled={loading}
          >
            <MoreHorizontal size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {selectedPeriod && (
            selectedPeriod.is_closed ? (
              <DropdownMenuItem
                onClick={handleReopenPeriod}
                disabled={loading}
              >
                <LockOpen size={14} className="mr-2" />
                Öppna igen
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleClosePeriod}
                disabled={loading}
              >
                <Lock size={14} className="mr-2" />
                Stäng månad
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
