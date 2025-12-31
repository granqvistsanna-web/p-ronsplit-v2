import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncomes } from "@/hooks/useIncomes";
import { BarChart3, ArrowUpRight, ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December"
];

export default function Analys() {
  const { household, loading: householdLoading } = useGroups();
  const { expenses, loading: expensesLoading } = useExpenses(household?.id);
  const { incomes, loading: incomesLoading } = useIncomes(household?.id);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loading = householdLoading || expensesLoading || incomesLoading;

  // Filter data by selected month
  const filteredData = useMemo(() => {
    const filteredExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
    const filteredIncomes = incomes.filter(i => {
      const date = new Date(i.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });

    return { filteredExpenses, filteredIncomes };
  }, [expenses, incomes, selectedYear, selectedMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalExpenses = filteredData.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = filteredData.filteredIncomes.reduce((sum, i) => sum + i.amount / 100, 0);
    const netto = totalIncomes - totalExpenses;

    return { totalExpenses, totalIncomes, netto };
  }, [filteredData]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; expenses: typeof filteredData.filteredExpenses }>();

    filteredData.filteredExpenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || { amount: 0, expenses: [] };
      categoryMap.set(expense.category, {
        amount: current.amount + expense.amount,
        expenses: [...current.expenses, expense]
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        expenses: data.expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData.filteredExpenses]);

  // Group by month for trend (last 6 months including current)
  const monthlyTrend = useMemo(() => {
    // First, group all data in a single pass
    const groups = new Map<string, { expenses: number; incomes: number }>();

    // Single pass through expenses
    expenses.forEach(e => {
      const expDate = new Date(e.date);
      const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      existing.expenses += e.amount;
      groups.set(monthKey, existing);
    });

    // Single pass through incomes
    incomes.forEach(i => {
      const incDate = new Date(i.date);
      const monthKey = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      existing.incomes += i.amount / 100;
      groups.set(monthKey, existing);
    });

    // Extract last 6 months
    const months: Array<{ month: string; expenses: number; incomes: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const data = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      months.push({
        month: monthKey,
        expenses: data.expenses,
        incomes: data.incomes
      });
    }

    return months;
  }, [expenses, incomes, selectedYear, selectedMonth]);

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="pt-14 lg:pt-0 lg:pl-64">
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="mb-6">
            <div className="h-8 w-32 rounded-md skeleton-shimmer mb-2" />
            <div className="h-4 w-56 rounded-md skeleton-shimmer" />
          </div>
          <div className="h-20 rounded-lg skeleton-shimmer mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg skeleton-shimmer" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          <div className="h-64 rounded-lg skeleton-shimmer mb-6" />
          <div className="h-48 rounded-lg skeleton-shimmer" />
        </main>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="pt-14 lg:pt-0 lg:pl-64">
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="rounded-full bg-muted p-4 mb-4">
              <BarChart3 size={28} className="text-muted-foreground" />
            </div>
            <p className="text-caption">Inget hushåll hittades.</p>
          </div>
        </main>
      </div>
    );
  }

  const maxTrendValue = Math.max(
    ...monthlyTrend.map(m => Math.max(m.expenses, m.incomes)),
    1
  );

  return (
    <div className="pt-14 lg:pt-0 lg:pl-64">
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-heading text-2xl mb-1">Analys</h1>
          <p className="text-caption">Ekonomisk översikt och utveckling</p>
        </div>

        {/* Time Filter - Persistent Month Selection */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-label-mono">
                  Månad
                </label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(Number(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-label-mono">
                  År
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Income */}
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-5">
              <div className="space-y-1">
                <p className="text-label-mono">
                  Inkomster
                </p>
                <p className="text-money-xl font-semibold text-foreground">
                  {totals.totalIncomes.toLocaleString("sv-SE")} kr
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-5">
              <div className="space-y-1">
                <p className="text-label-mono">
                  Utgifter
                </p>
                <p className="text-money-xl font-semibold text-foreground">
                  {totals.totalExpenses.toLocaleString("sv-SE")} kr
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-5">
              <div className="space-y-1">
                <p className="text-label-mono">
                  Netto
                </p>
                <p className={`text-money-xl font-semibold ${totals.netto >= 0 ? 'text-income' : 'text-icon-pink'}`}>
                  {totals.netto >= 0 ? '+' : ''}{totals.netto.toLocaleString("sv-SE")} kr
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Visualization - 6 Month View */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Utveckling</CardTitle>
            <p className="text-caption mt-1">Senaste 6 månaderna</p>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {monthlyTrend.some(m => m.expenses > 0 || m.incomes > 0) ? (
              <div className="space-y-5">
                {monthlyTrend.map((item, idx) => {
                  const expenseHeight = maxTrendValue > 0 ? (item.expenses / maxTrendValue) * 100 : 0;
                  const incomeHeight = maxTrendValue > 0 ? (item.incomes / maxTrendValue) * 100 : 0;
                  const isCurrentMonth = item.month === `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

                  return (
                    <div 
                      key={item.month} 
                      className="space-y-2 animate-fade-in"
                      style={{ animationDelay: `${300 + idx * 50}ms` }}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {MONTHS[parseInt(item.month.split('-')[1]) - 1]} {item.month.split('-')[0]}
                        </span>
                        <div className="flex gap-4 text-xs text-numeric">
                          <span className="text-income">
                            +{item.incomes.toLocaleString("sv-SE")}
                          </span>
                          <span className="text-expense">
                            -{item.expenses.toLocaleString("sv-SE")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 h-2.5">
                        <div className="flex-1 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-income rounded-sm transition-all duration-500"
                            style={{ width: `${incomeHeight}%` }}
                          />
                        </div>
                        <div className="flex-1 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-expense rounded-sm transition-all duration-500"
                            style={{ width: `${expenseHeight}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-income" />
                    <span className="text-caption">Inkomster</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-expense" />
                    <span className="text-caption">Utgifter</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <BarChart3 size={20} className="text-muted-foreground" />
                </div>
                <p className="text-caption">Ingen data tillgänglig</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Utgifter per kategori</CardTitle>
            <p className="text-caption mt-1">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {expensesByCategory.length > 0 ? (
              <div className="space-y-4">
                {expensesByCategory.map((item, idx) => {
                  const total = totals.totalExpenses + totals.totalIncomes;
                  const percentage = total > 0
                    ? (item.amount / total) * 100
                    : 0;
                  const isExpanded = expandedCategories.has(item.category);

                  return (
                    <div
                      key={item.category}
                      className="space-y-2 animate-fade-in"
                      style={{ animationDelay: `${350 + idx * 30}ms` }}
                    >
                      <div
                        className="flex items-baseline justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleCategory(item.category)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-muted-foreground" />
                          ) : (
                            <ChevronRight size={16} className="text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-caption text-numeric">
                          {item.amount.toLocaleString("sv-SE")} kr · {percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/80 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {isExpanded && (
                        <div className="mt-3 ml-6 space-y-2 border-l-2 border-border/40 pl-3">
                          {item.expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="flex items-start justify-between py-2 text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {expense.description}
                                </p>
                                <p className="text-caption text-xs">
                                  {new Date(expense.date).toLocaleDateString("sv-SE", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                  })}
                                </p>
                              </div>
                              <span className="text-numeric font-medium ml-3 flex-shrink-0">
                                {expense.amount.toLocaleString("sv-SE")} kr
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <ArrowUpRight size={20} className="text-muted-foreground" />
                </div>
                <p className="text-caption">Inga utgifter för vald period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}