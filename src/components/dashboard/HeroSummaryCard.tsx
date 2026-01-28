import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "@/components/MonthSelector";

interface HeroSummaryCardProps {
  totalIncomes: number;
  totalExpenses: number;
  netto: number;
  animatedIncomeWidth: number;
  animatedExpenseWidth: number;
}

export const HeroSummaryCard = ({
  totalIncomes,
  totalExpenses,
  netto,
  animatedIncomeWidth,
  animatedExpenseWidth,
}: HeroSummaryCardProps) => {
  return (
    <Card className="mb-8 animate-fade-in" style={{ animationDelay: '20ms' }}>
      <CardContent className="p-5 sm:p-6">
        {/* Month selector - integrated */}
        <div className="mb-4">
          <MonthSelector />
        </div>

        {/* Netto - Hero focus */}
        <div className="text-center mb-5">
          <p className="text-label-mono mb-1">Netto</p>
          <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${netto >= 0 ? 'text-income' : 'text-expense'}`}>
            {netto >= 0 ? '+' : ''}{Math.round(netto).toLocaleString("sv-SE")} kr
          </p>
        </div>

        {/* Horizontal split bar */}
        <div className="mb-5">
          <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
            {(totalIncomes > 0 || totalExpenses > 0) ? (
              <>
                <div
                  className="h-full bg-income transition-all duration-500 ease-out"
                  style={{ width: `${animatedIncomeWidth}%` }}
                />
                <div
                  className="h-full bg-expense transition-all duration-500 ease-out"
                  style={{ width: `${animatedExpenseWidth}%` }}
                />
              </>
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        </div>

        {/* In/Out summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-income" />
              <span className="text-caption text-xs">Inkomster</span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              {Math.round(totalIncomes).toLocaleString("sv-SE")} kr
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-expense" />
              <span className="text-caption text-xs">Utgifter</span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              {Math.round(totalExpenses).toLocaleString("sv-SE")} kr
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
