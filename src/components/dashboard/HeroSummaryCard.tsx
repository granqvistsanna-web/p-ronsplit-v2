import { Card, CardContent } from "@/components/ui/card";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import type { Period } from "@/lib/types";

interface HeroSummaryCardProps {
  totalIncomes: number;
  totalExpenses: number;
  netto: number;
  animatedIncomeWidth: number;
  animatedExpenseWidth: number;
  periods: Period[];
  selectedPeriod: Period | null;
  onSelectPeriod: (periodId: string) => void;
  onClosePeriod: (periodId: string) => Promise<boolean>;
  onReopenPeriod: (periodId: string) => Promise<boolean>;
  outstandingBalance?: number;
}

export const HeroSummaryCard = ({
  totalIncomes,
  totalExpenses,
  netto,
  animatedIncomeWidth,
  animatedExpenseWidth,
  periods,
  selectedPeriod,
  onSelectPeriod,
  onClosePeriod,
  onReopenPeriod,
  outstandingBalance,
}: HeroSummaryCardProps) => {
  const animatedNetto = useCountAnimation(Math.abs(netto), { duration: 1000, delay: 100, animateOnChange: true });
  const animatedIncome = useCountAnimation(totalIncomes, { duration: 1000, delay: 200, animateOnChange: true });
  const animatedExpense = useCountAnimation(totalExpenses, { duration: 1000, delay: 250, animateOnChange: true });

  return (
    <Card className="mb-8 animate-fade-in" style={{ animationDelay: '20ms' }}>
      <CardContent className="p-5 sm:p-6">
        {/* Period selector - integrated */}
        <div className="mb-4">
          <PeriodSelector
            periods={periods}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={onSelectPeriod}
            onClosePeriod={onClosePeriod}
            onReopenPeriod={onReopenPeriod}
            outstandingBalance={outstandingBalance}
          />
        </div>

        {/* Netto - Hero focus */}
        <div className="text-center mb-5">
          <p className="text-label-mono mb-1">Netto</p>
          <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${netto >= 0 ? 'text-income' : 'text-expense'}`}>
            {netto >= 0 ? '+' : '−'}{Math.round(animatedNetto).toLocaleString("sv-SE")} kr
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
              {Math.round(animatedIncome).toLocaleString("sv-SE")} kr
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-expense" />
              <span className="text-caption text-xs">Utgifter</span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              {Math.round(animatedExpense).toLocaleString("sv-SE")} kr
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
