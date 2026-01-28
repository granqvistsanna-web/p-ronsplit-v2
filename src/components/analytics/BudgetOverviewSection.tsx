import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  calculateBudgetMetrics,
  calculateBudgetSummary,
  getBudgetProgressColor,
  formatBudgetAmount,
} from "@/lib/budgetUtils";
import type { Budget } from "@/hooks/useBudgets";
import type { Expense } from "@/lib/types";
import { Settings2, Wallet, TrendingDown, PiggyBank } from "lucide-react";

interface BudgetOverviewSectionProps {
  budgets: Budget[];
  expenses: Expense[];
  year: number;
  month?: number;
  period: "monthly" | "yearly";
  onEditBudgets: () => void;
  loading?: boolean;
}

export function BudgetOverviewSection({
  budgets,
  expenses,
  year,
  month,
  period,
  onEditBudgets,
  loading,
}: BudgetOverviewSectionProps) {
  const metrics = useMemo(
    () => calculateBudgetMetrics(budgets, expenses, year, month),
    [budgets, expenses, year, month]
  );

  const summary = useMemo(() => calculateBudgetSummary(metrics), [metrics]);

  // No budgets set yet - show setup prompt
  if (budgets.length === 0 && !loading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Wallet size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ingen budget satt</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Sätt upp en {period === "monthly" ? "månads" : "års"}budget för
              att följa dina utgifter och hålla koll på ekonomin.
            </p>
            <Button onClick={onEditBudgets} className="gap-2">
              <Settings2 size={16} />
              Sätt upp budget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg skeleton-shimmer"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Budget */}
        <Card className="group hover:shadow-notion transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-label-mono">
                  {period === "monthly" ? "Månads" : "Års"}budget
                </p>
                <p className="text-number-lg font-semibold text-foreground">
                  {formatBudgetAmount(summary.totalBudget)}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-2">
                <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spent */}
        <Card className="group hover:shadow-notion transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-label-mono">Spenderat</p>
                <p className="text-number-lg font-semibold text-foreground">
                  {formatBudgetAmount(summary.totalSpent)}
                </p>
              </div>
              <div className="rounded-full bg-expense-bg p-2">
                <TrendingDown size={16} className="text-expense" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card className="group hover:shadow-notion transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-label-mono">Kvar</p>
                <p
                  className={`text-number-lg font-semibold ${
                    summary.totalRemaining >= 0
                      ? "text-income"
                      : "text-icon-pink"
                  }`}
                >
                  {formatBudgetAmount(summary.totalRemaining, true)}
                </p>
              </div>
              <div
                className={`rounded-full p-2 ${
                  summary.totalRemaining >= 0 ? "bg-income-bg" : "bg-expense-bg"
                }`}
              >
                <PiggyBank
                  size={16}
                  className={
                    summary.totalRemaining >= 0 ? "text-income" : "text-expense"
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total budgetförbrukning</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  summary.status === "on-track"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : summary.status === "warning"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                {summary.status === "on-track"
                  ? "På rätt väg"
                  : summary.status === "warning"
                  ? "Varning"
                  : "Överskriden"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-number-sm font-semibold">
                {summary.percentUsed.toFixed(0)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditBudgets}
                className="gap-1 h-8"
              >
                <Settings2 size={14} />
                Redigera
              </Button>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressColor(
                summary.status
              )}`}
              style={{ width: `${Math.min(summary.percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {summary.categoriesOnTrack} kategorier på rätt väg
            </span>
            <span>
              {summary.categoriesWarning > 0 &&
                `${summary.categoriesWarning} varning`}
              {summary.categoriesWarning > 0 &&
                summary.categoriesExceeded > 0 &&
                ", "}
              {summary.categoriesExceeded > 0 &&
                `${summary.categoriesExceeded} överskriden`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
