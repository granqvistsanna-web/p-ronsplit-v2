import { useState, useMemo } from "react";
import { toKronor } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncomes } from "@/hooks/useIncomes";
import { useSidebar } from "@/hooks/useSidebar";
import { useFilterParams } from "@/hooks/useFilterParams";
import { ChevronRight } from "lucide-react";
import { TrendChart, CategoryDonut, CategoryLegend, ComparisonBar, CategoryChartSection } from "@/components/analytics";
import { FilterBar } from "@/components/filters";
import { format, subMonths } from "date-fns";
import { sv } from "date-fns/locale";

export default function Analys() {
  const { household, loading: householdLoading } = useGroups();
  const { dateRange, memberIds } = useFilterParams();
  const { expenses, loading: expensesLoading } = useExpenses({
    groupId: household?.id || '',
    dateRange,
    memberIds,
  });
  const { incomes, loading: incomesLoading } = useIncomes({
    groupId: household?.id || '',
    dateRange,
    memberIds,
  });
  const { sidebarWidth } = useSidebar();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loading = householdLoading || expensesLoading || incomesLoading;

  // Calculate totals (server-side filtered data)
  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = incomes.filter(i => i.included_in_split).reduce((sum, i) => sum + toKronor(i.amount), 0);
    const netto = totalIncomes - totalExpenses;

    return { totalExpenses, totalIncomes, netto };
  }, [expenses, incomes]);

  // Group expenses by category (server-side filtered data)
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; expenses: typeof expenses }>();

    expenses.forEach(expense => {
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
  }, [expenses]);

  // Group by month for trend (last 6 months ending at dateRange.end)
  const monthlyTrend = useMemo(() => {
    // First, group all data in a single pass
    const groups = new Map<string, { expenses: number; incomes: number }>();

    // Single pass through expenses (apply member filter but not date filter for trend)
    expenses.forEach(e => {
      const matchesMember = memberIds.length === 0 || memberIds.includes(e.paid_by);
      if (!matchesMember) return;

      const expDate = new Date(e.date);
      const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      existing.expenses += e.amount;
      groups.set(monthKey, existing);
    });

    // Single pass through incomes
    incomes.forEach(i => {
      if (!i.included_in_split) return;
      const matchesMember = memberIds.length === 0 || memberIds.includes(i.recipient);
      if (!matchesMember) return;

      const incDate = new Date(i.date);
      const monthKey = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      existing.incomes += toKronor(i.amount);
      groups.set(monthKey, existing);
    });

    // Extract last 6 months ending at dateRange.end
    const months: Array<{ month: string; expenses: number; incomes: number }> = [];
    const endDate = dateRange.end;
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(endDate, i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const data = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      months.push({
        month: monthKey,
        expenses: data.expenses,
        incomes: data.incomes
      });
    }

    return months;
  }, [expenses, incomes, dateRange, memberIds]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    const startMonth = format(dateRange.start, 'MMM yyyy', { locale: sv });
    const endMonth = format(dateRange.end, 'MMM yyyy', { locale: sv });
    if (startMonth === endMonth) {
      return format(dateRange.start, 'MMMM yyyy', { locale: sv });
    }
    return `${format(dateRange.start, 'MMM', { locale: sv })} - ${format(dateRange.end, 'MMM yyyy', { locale: sv })}`;
  }, [dateRange]);

  // Get current month key for chart highlighting
  const currentMonthKey = useMemo(() => {
    const endDate = dateRange.end;
    return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
  }, [dateRange]);

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
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
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
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <p className="text-muted-foreground">Inget hushåll hittades</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">Analys</h1>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '20ms' }}>
          <FilterBar members={household?.members || []} loading={loading} />
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Income */}
          <Card className="animate-fade-in hover-lift" style={{ animationDelay: '40ms' }}>
            <CardContent className="p-6">
              <p className="text-label-mono mb-2">Inkomster</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-income">
                {totals.totalIncomes.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
              </p>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="animate-fade-in hover-lift" style={{ animationDelay: '60ms' }}>
            <CardContent className="p-6">
              <p className="text-label-mono mb-2">Utgifter</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {totals.totalExpenses.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
              </p>
            </CardContent>
          </Card>

          {/* Netto */}
          <Card className="animate-fade-in hover-lift" style={{ animationDelay: '80ms' }}>
            <CardContent className="p-6">
              <p className="text-label-mono mb-2">Netto</p>
              <p className={`text-2xl font-semibold tracking-tight tabular-nums ${totals.netto >= 0 ? 'text-income' : 'text-icon-pink'}`}>
                {totals.netto >= 0 ? '+' : ''}{totals.netto.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Visualization */}
        <Card className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Utveckling</CardTitle>
            <p className="text-caption">Inkomster & utgifter senaste 6 månaderna</p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {monthlyTrend.some(m => m.expenses > 0 || m.incomes > 0) ? (
              <TrendChart
                data={monthlyTrend}
                selectedMonth={currentMonthKey}
              />
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">Ingen data tillgänglig</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Result */}
        <Card className="mb-8 animate-fade-in" style={{ animationDelay: '120ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">Månadsresultat</CardTitle>
            <p className="text-caption">Netto per månad (inkomster − utgifter)</p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {monthlyTrend.some(m => m.expenses > 0 || m.incomes > 0) ? (
              <ComparisonBar
                data={monthlyTrend}
                selectedMonth={currentMonthKey}
              />
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">Ingen data tillgänglig</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="mb-8 animate-fade-in" style={{ animationDelay: '135ms' }}>
          <CardContent className="p-6">
            <CategoryChartSection />
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '140ms' }}>
          {/* Donut Chart Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">Kategorifördelning</CardTitle>
              <p className="text-caption capitalize">{formattedDateRange}</p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <CategoryDonut
                    data={expensesByCategory}
                    totalExpenses={totals.totalExpenses}
                  />
                  <div className="pt-3 border-t border-border/30">
                    <CategoryLegend
                      data={expensesByCategory}
                      totalExpenses={totals.totalExpenses}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <p className="text-muted-foreground text-sm">Inga utgifter för vald period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">Utgifter per kategori</CardTitle>
              <p className="text-caption">Andel av inkomst · Klicka för detaljer</p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary: Total expenses as % of income */}
                  {totals.totalIncomes > 0 && (
                    <div className="p-4 rounded-lg bg-muted/40 mb-2">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs text-muted-foreground">Totala utgifter av inkomst</span>
                        <span className={`text-lg font-semibold tabular-nums ${
                          (totals.totalExpenses / totals.totalIncomes) * 100 > 100 ? 'text-icon-pink' :
                          (totals.totalExpenses / totals.totalIncomes) * 100 > 80 ? 'text-amber-500' : 'text-income'
                        }`}>
                          {((totals.totalExpenses / totals.totalIncomes) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            (totals.totalExpenses / totals.totalIncomes) * 100 > 100 ? 'bg-icon-pink' :
                            (totals.totalExpenses / totals.totalIncomes) * 100 > 80 ? 'bg-amber-500' : 'bg-income'
                          }`}
                          style={{ width: `${Math.min((totals.totalExpenses / totals.totalIncomes) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        {totals.netto >= 0
                          ? `Sparar ${((totals.netto / totals.totalIncomes) * 100).toFixed(0)}% av inkomsten`
                          : `Överskrider budget med ${((-totals.netto / totals.totalIncomes) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto">
                  {expensesByCategory.map((item, idx) => {
                    const percentOfIncome = totals.totalIncomes > 0
                      ? (item.amount / totals.totalIncomes) * 100
                      : 0;
                    const isExpanded = expandedCategories.has(item.category);

                    return (
                      <div
                        key={item.category}
                        className="animate-fade-in"
                        style={{ animationDelay: `${160 + idx * 15}ms` }}
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-muted/40 rounded-md px-3 py-2.5 -mx-3 transition-colors"
                          onClick={() => toggleCategory(item.category)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronRight
                              size={14}
                              className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            />
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className={`text-xs tabular-nums ${percentOfIncome > 30 ? 'text-icon-pink' : percentOfIncome > 15 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {percentOfIncome.toFixed(0)}%
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {item.amount.toLocaleString("sv-SE")} kr
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-0.5 bg-muted/60 rounded-full overflow-hidden mx-3 mt-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${percentOfIncome > 30 ? 'bg-icon-pink' : percentOfIncome > 15 ? 'bg-amber-500' : 'bg-foreground/20'}`}
                            style={{ width: `${Math.min(percentOfIncome, 100)}%` }}
                          />
                        </div>

                        {isExpanded && (
                          <div className="mt-2 ml-5 space-y-0.5 border-l border-border/30 pl-4 animate-fade-in">
                            {item.expenses.map((expense) => (
                              <div
                                key={expense.id}
                                className="flex items-center justify-between py-2 text-sm hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground/80 truncate">
                                    {expense.description || "Ingen beskrivning"}
                                  </p>
                                  <p className="text-xs text-muted-foreground tabular-nums">
                                    {new Date(expense.date).toLocaleDateString("sv-SE", {
                                      day: "numeric",
                                      month: "short"
                                    })}
                                  </p>
                                </div>
                                <span className="text-sm tabular-nums text-muted-foreground ml-3 flex-shrink-0">
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
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground text-sm">Inga utgifter för vald period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Budget Section */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '160ms' }}>
          <h2 className="text-xl font-semibold tracking-tight mb-6">Budget</h2>

          {/* Budget Overview */}
          <div className="mb-6">
            <BudgetOverviewSection
              budgets={budgets}
              expenses={expenses}
              year={currentYear}
              period="yearly"
              onEditBudgets={() => setShowBudgetSettings(true)}
              loading={budgetsLoading}
            />
          </div>

          {/* Budget by Category */}
          {budgets.length > 0 && (
            <BudgetCategoryList
              budgets={budgets}
              expenses={expenses}
              year={currentYear}
              loading={budgetsLoading}
            />
          )}
        </div>
      </main>

      {/* Budget Settings Modal */}
      <BudgetSettingsModal
        isOpen={showBudgetSettings}
        onClose={() => setShowBudgetSettings(false)}
        onSave={async (budgetsToSave) => {
          for (const budget of budgetsToSave) {
            await saveBudget(budget);
          }
        }}
        groupId={household?.id || ''}
        existingBudgets={budgets}
        expenses={expenses}
        period="yearly"
      />
    </div>
  );
}
