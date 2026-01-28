import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateBudgetMetrics,
  getBudgetProgressColor,
  getBudgetStatusColor,
  formatBudgetAmount,
  type BudgetMetric,
} from "@/lib/budgetUtils";
import type { Budget } from "@/hooks/useBudgets";
import type { Expense } from "@/lib/types";
import { Target, ChevronDown, ChevronRight } from "lucide-react";

interface BudgetCategoryListProps {
  budgets: Budget[];
  expenses: Expense[];
  year: number;
  month?: number;
  loading?: boolean;
}

interface CategoryExpenseDetail {
  id: string;
  description: string | null;
  amount: number;
  date: string;
}

export function BudgetCategoryList({
  budgets,
  expenses,
  year,
  month,
  loading,
}: BudgetCategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const metrics = useMemo(
    () => calculateBudgetMetrics(budgets, expenses, year, month),
    [budgets, expenses, year, month]
  );

  // Get expenses grouped by category for drill-down
  const expensesByCategory = useMemo(() => {
    const result: Record<string, CategoryExpenseDetail[]> = {};

    // Date range filtering
    const startDate = month !== undefined
      ? new Date(year, month, 1)
      : new Date(year, 0, 1);
    const endDate = month !== undefined
      ? new Date(year, month + 1, 0)
      : new Date(year, 11, 31);
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    for (const expense of expenses) {
      if (expense.date < startStr || expense.date > endStr) continue;

      const categoryId = expense.category.toLowerCase();
      if (!result[categoryId]) {
        result[categoryId] = [];
      }
      result[categoryId].push({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
      });
    }

    // Sort expenses by date (newest first)
    for (const categoryId of Object.keys(result)) {
      result[categoryId].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    return result;
  }, [expenses, year, month]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg skeleton-shimmer"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Target size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ingen budget att visa
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target size={18} className="text-muted-foreground" />
          Budget per kategori
        </CardTitle>
        <p className="text-caption mt-1">Klicka för att se detaljer</p>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {metrics.map((metric, idx) => (
            <BudgetCategoryItem
              key={metric.categoryId}
              metric={metric}
              expenses={expensesByCategory[metric.categoryId.toLowerCase()] || []}
              isExpanded={expandedCategories.has(metric.categoryId)}
              onToggle={() => toggleCategory(metric.categoryId)}
              animationDelay={idx * 30}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface BudgetCategoryItemProps {
  metric: BudgetMetric;
  expenses: CategoryExpenseDetail[];
  isExpanded: boolean;
  onToggle: () => void;
  animationDelay: number;
}

function BudgetCategoryItem({
  metric,
  expenses,
  isExpanded,
  onToggle,
  animationDelay,
}: BudgetCategoryItemProps) {
  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Category Header */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onToggle}
      >
        {/* Icon and Name */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <span className="text-xl">{metric.icon}</span>
          <span className="font-medium text-sm">{metric.categoryName}</span>
        </div>

        {/* Progress Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {formatBudgetAmount(metric.spent)} av{" "}
              {formatBudgetAmount(metric.budget)}
            </span>
            <span
              className={`text-number-sm font-semibold ${getBudgetStatusColor(
                metric.status
              )}`}
            >
              {metric.percentUsed.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBudgetProgressColor(
                metric.status
              )}`}
              style={{ width: `${Math.min(metric.percentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining */}
        <div className="text-right min-w-[80px]">
          <span
            className={`text-number-sm font-medium ${
              metric.remaining >= 0 ? "text-income" : "text-icon-pink"
            }`}
          >
            {formatBudgetAmount(metric.remaining, true)}
          </span>
          <p className="text-xs text-muted-foreground">kvar</p>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && expenses.length > 0 && (
        <div className="mt-2 ml-4 space-y-1 border-l-2 border-border/40 pl-3 animate-fade-in">
          {expenses.slice(0, 10).map((expense) => (
            <div
              key={expense.id}
              className="flex items-start justify-between py-1.5 text-sm hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {expense.description || "Ingen beskrivning"}
                </p>
                <p className="text-timestamp text-xs">
                  {new Date(expense.date).toLocaleDateString("sv-SE", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <span className="text-number-sm font-medium ml-3 flex-shrink-0">
                {expense.amount.toLocaleString("sv-SE")} kr
              </span>
            </div>
          ))}
          {expenses.length > 10 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              +{expenses.length - 10} fler transaktioner
            </p>
          )}
        </div>
      )}

      {isExpanded && expenses.length === 0 && (
        <div className="mt-2 ml-4 py-3 text-center text-sm text-muted-foreground animate-fade-in">
          Inga utgifter i denna kategori
        </div>
      )}
    </div>
  );
}
