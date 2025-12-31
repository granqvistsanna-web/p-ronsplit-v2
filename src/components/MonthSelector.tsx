import { useMonthSelection } from "@/hooks/useMonthSelection";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"
];

export function MonthSelector() {
  const {
    selectedYear,
    selectedMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    isCurrentMonth,
  } = useMonthSelection();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Check if we can go to next month (don't allow future months)
  const canGoNext = !(selectedYear === currentYear && selectedMonth === currentMonth);

  // Format display: "Dec 2025" or just "December" if current year
  const monthDisplay = MONTHS_SHORT[selectedMonth - 1];
  const yearDisplay = selectedYear !== currentYear ? ` ${selectedYear}` : "";

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousMonth}
        className="h-8 w-8 hover:bg-secondary/80"
      >
        <ChevronLeft size={18} />
      </Button>

      <button
        onClick={goToCurrentMonth}
        disabled={isCurrentMonth}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-w-[100px]",
          isCurrentMonth 
            ? "text-foreground cursor-default" 
            : "text-foreground hover:bg-secondary/60 cursor-pointer"
        )}
        title={!isCurrentMonth ? "Klicka för att gå till aktuell månad" : undefined}
      >
        {monthDisplay}{yearDisplay}
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        disabled={!canGoNext}
        className={cn(
          "h-8 w-8 hover:bg-secondary/80",
          !canGoNext && "opacity-40 cursor-not-allowed"
        )}
      >
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}
