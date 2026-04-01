import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Check,
  Lock,
  LockOpen,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/types";

/** Format a short date range like "1 apr – 20 apr" or "1 apr –" if open */
function formatDateRange(startDate: string, endDate: string | null): string {
  const fmt = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };
  if (!endDate) return `${fmt(startDate)} –`;
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriod: Period | null;
  onSelectPeriod: (periodId: string) => void;
  onClosePeriod: (periodId: string) => Promise<boolean>;
  onReopenPeriod: (periodId: string) => Promise<boolean>;
  /** Outstanding balance amount (in kronor). If > 0, a warning is shown before closing. */
  outstandingBalance?: number;
}

export function PeriodSelector({
  periods,
  selectedPeriod,
  onSelectPeriod,
  onClosePeriod,
  onReopenPeriod,
  outstandingBalance = 0,
}: PeriodSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasOutstandingBalance = outstandingBalance >= 1;

  const handleClosePeriod = async () => {
    if (!selectedPeriod || selectedPeriod.is_closed) return;
    setShowConfirm(true);
  };

  const confirmClose = async () => {
    if (!selectedPeriod) return;
    setLoading(true);
    try {
      await onClosePeriod(selectedPeriod.id);
    } finally {
      setLoading(false);
      setShowConfirm(false);
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
    <>
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
                <>
                  {selectedPeriod.is_closed && (
                    <Lock size={14} className="text-muted-foreground" />
                  )}
                  <span className="flex flex-col items-start leading-tight">
                    <span>{selectedPeriod.name}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {formatDateRange(selectedPeriod.start_date, selectedPeriod.end_date)}
                    </span>
                  </span>
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
                <span className="flex flex-col leading-tight">
                  <span
                    className={cn(
                      period.is_closed && "text-muted-foreground"
                    )}
                  >
                    {period.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateRange(period.start_date, period.end_date)}
                  </span>
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

            {/* Close/reopen action inline */}
            {selectedPeriod && (
              <>
                <DropdownMenuSeparator />
                {selectedPeriod.is_closed ? (
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
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Close period confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
              onClick={() => !loading && setShowConfirm(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="close-period-title"
                className="bg-card border border-border rounded-md p-6 w-full max-w-sm"
              >
                <h2
                  id="close-period-title"
                  className="text-lg font-medium text-foreground mb-1"
                >
                  Stäng {selectedPeriod?.name}?
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Nästa månad skapas automatiskt. Du kan öppna igen om det behövs.
                </p>

                {hasOutstandingBalance && (
                  <div className="flex items-start gap-3 rounded-md bg-orange-500/10 border border-orange-500/20 p-3 mb-4">
                    <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      Det finns en utestående skuld på{" "}
                      <span className="font-medium">
                        {Math.round(outstandingBalance).toLocaleString("sv-SE")} kr
                      </span>
                      {" "}som inte är avräknad.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Avbryt
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={confirmClose}
                    disabled={loading}
                  >
                    {loading ? "Stänger..." : "Stäng månad"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
