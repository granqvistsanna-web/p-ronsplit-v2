import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncomes } from "@/hooks/useIncomes";
import { useBudgets } from "@/hooks/useBudgets";
import { useSidebar } from "@/hooks/useSidebar";
import { useFilterParams } from "@/hooks/useFilterParams";
import { BarChart3, ArrowUpRight, ChevronDown, ChevronRight, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { TrendChart, CategoryDonut, CategoryLegend, ComparisonBar, CategoryChartSection, BudgetOverviewSection, BudgetCategoryList } from "@/components/analytics";
import { BudgetSettingsModal } from "@/components/BudgetSettingsModal";
import { FilterBar } from "@/components/filters";
import { format, subMonths } from "date-fns";
import { sv } from "date-fns/locale";

export default function Analys() {
  const { household, loading: householdLoading } = useGroups();
  const { expenses, loading: expensesLoading } = useExpenses({ groupId: household?.id || '' });
  const { incomes, loading: incomesLoading } = useIncomes({ groupId: household?.id || '' });
  const { budgets, loading: budgetsLoading, saveBudget } = useBudgets({
    groupId: household?.id || '',
    period: 'yearly',
  });
  const { sidebarWidth } = useSidebar();
  const { dateRange, memberIds } = useFilterParams();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

  const loading = householdLoading || expensesLoading || incomesLoading;

  // Current year and month for budget calculations
  const currentYear = dateRange.end.getFullYear();
  const currentMonth = dateRange.end.getMonth();

  // Filter data by dateRange and memberIds
  const filteredData = useMemo(() => {
    const filteredExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      const matchesDate = expenseDate >= dateRange.start && expenseDate <= dateRange.end;
      const matchesMember = memberIds.length === 0 || memberIds.includes(e.paid_by);
      return matchesDate && matchesMember;
    });
    const filteredIncomes = incomes.filter(i => {
      const incomeDate = new Date(i.date);
      const matchesDate = incomeDate >= dateRange.start && incomeDate <= dateRange.end;
      const matchesMember = memberIds.length === 0 || memberIds.includes(i.recipient);
      return matchesDate && matchesMember;
    });

    return { filteredExpenses, filteredIncomes };
  }, [expenses, incomes, dateRange, memberIds]);

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
  }, [filteredData]);

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
      const matchesMember = memberIds.length === 0 || memberIds.includes(i.recipient);
      if (!matchesMember) return;

      const incDate = new Date(i.date);
      const monthKey = `${incDate.getFullYear()}-${String(incDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(monthKey) || { expenses: 0, incomes: 0 };
      existing.incomes += i.amount / 100;
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
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="rounded-full bg-muted p-4 mb-4">
              <BarChart3 size={24} className="text-muted-foreground" />
            </div>
            <p className="text-caption">Inget hushåll hittades.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-heading text-2xl">Analys</h1>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '20ms' }}>
          <FilterBar members={household?.members || []} loading={loading} />
        </div>

        {/* Summary Metrics - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Income */}
          <Card className="animate-fade-in group hover:shadow-notion transition-shadow" style={{ animationDelay: '40ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-label-mono">
                    Inkomster
                  </p>
                  <p className="text-number-lg font-semibold text-foreground">
                    {totals.totalIncomes.toLocaleString("sv-SE")} kr
                  </p>
                </div>
                <div className="rounded-full bg-income-bg p-2">
                  <TrendingUp size={16} className="text-income" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="animate-fade-in group hover:shadow-notion transition-shadow" style={{ animationDelay: '60ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-label-mono">
                    Utgifter
                  </p>
                  <p className="text-number-lg font-semibold text-foreground">
                    {totals.totalExpenses.toLocaleString("sv-SE")} kr
                  </p>
                </div>
                <div className="rounded-full bg-expense-bg p-2">
                  <TrendingDown size={16} className="text-expense" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Netto */}
          <Card className="animate-fade-in group hover:shadow-notion transition-shadow" style={{ animationDelay: '80ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-label-mono">
                    Netto
                  </p>
                  <p className={`text-number-lg font-semibold ${totals.netto >= 0 ? 'text-income' : 'text-icon-pink'}`}>
                    {totals.netto >= 0 ? '+' : ''}{totals.netto.toLocaleString("sv-SE")} kr
                  </p>
                </div>
                <div className={`rounded-full p-2 ${totals.netto >= 0 ? 'bg-income-bg' : 'bg-expense-bg'}`}>
                  {totals.netto >= 0 ? (
                    <TrendingUp size={16} className="text-income" />
                  ) : (
                    <TrendingDown size={16} className="text-expense" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Overview Section */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '90ms' }}>
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
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '95ms' }}>
            <BudgetCategoryList
              budgets={budgets}
              expenses={expenses}
              year={currentYear}
              loading={budgetsLoading}
            />
          </div>
        )}

        {/* Trend Visualization - 6 Month View with Recharts */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp size={18} className="text-muted-foreground" />
                  Utveckling
                </CardTitle>
                <p className="text-caption mt-1">Inkomster & utgifter senaste 6 månaderna</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {monthlyTrend.some(m => m.expenses > 0 || m.incomes > 0) ? (
              <TrendChart
                data={monthlyTrend}
                selectedMonth={currentMonthKey}
              />
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

        {/* Netto Comparison Bar Chart */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '120ms' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {totals.netto >= 0 ? (
                    <TrendingUp size={18} className="text-income" />
                  ) : (
                    <TrendingDown size={18} className="text-icon-pink" />
                  )}
                  Månadsresultat
                </CardTitle>
                <p className="text-caption mt-1">Netto per månad (inkomster - utgifter)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {monthlyTrend.some(m => m.expenses > 0 || m.incomes > 0) ? (
              <ComparisonBar
                data={monthlyTrend}
                selectedMonth={currentMonthKey}
              />
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

        {/* Category Bar Chart with Stacked Mode */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: '135ms' }}>
          <CardContent className="p-5">
            <CategoryChartSection />
          </CardContent>
        </Card>

        {/* Category Breakdown with Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '140ms' }}>
          {/* Donut Chart Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart size={18} className="text-muted-foreground" />
                Kategorifördelning
              </CardTitle>
              <p className="text-caption mt-1 capitalize">
                {formattedDateRange}
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <CategoryDonut
                    data={expensesByCategory}
                    totalExpenses={totals.totalExpenses}
                  />
                  <div className="pt-2 border-t border-border/40">
                    <CategoryLegend
                      data={expensesByCategory}
                      totalExpenses={totals.totalExpenses}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <PieChart size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-caption">Inga utgifter för vald period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Category List */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ArrowUpRight size={18} className="text-muted-foreground" />
                Utgifter per kategori
              </CardTitle>
              <p className="text-caption mt-1">
                Andel av inkomst - Klicka för detaljer
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {/* Summary: Total expenses as % of income */}
                  {totals.totalIncomes > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Totala utgifter av inkomst</span>
                        <span className={`text-number-sm font-semibold ${
                          (totals.totalExpenses / totals.totalIncomes) * 100 > 100 ? 'text-icon-pink' :
                          (totals.totalExpenses / totals.totalIncomes) * 100 > 80 ? 'text-amber-500' : 'text-income'
                        }`}>
                          {((totals.totalExpenses / totals.totalIncomes) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (totals.totalExpenses / totals.totalIncomes) * 100 > 100 ? 'bg-icon-pink' :
                            (totals.totalExpenses / totals.totalIncomes) * 100 > 80 ? 'bg-amber-500' : 'bg-income'
                          }`}
                          style={{ width: `${Math.min((totals.totalExpenses / totals.totalIncomes) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {totals.netto >= 0
                          ? `Sparar ${((totals.netto / totals.totalIncomes) * 100).toFixed(0)}% av inkomsten`
                          : `Överskrider budget med ${((-totals.netto / totals.totalIncomes) * 100).toFixed(0)}%`
                        }
                      </p>
                    </div>
                  )}
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {expensesByCategory.map((item, idx) => {
                    const percentOfExpenses = totals.totalExpenses > 0
                      ? (item.amount / totals.totalExpenses) * 100
                      : 0;
                    const percentOfIncome = totals.totalIncomes > 0
                      ? (item.amount / totals.totalIncomes) * 100
                      : 0;
                    const isExpanded = expandedCategories.has(item.category);

                    return (
                      <div
                        key={item.category}
                        className="animate-fade-in"
                        style={{ animationDelay: `${160 + idx * 12}ms` }}
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-2 -mx-2 transition-colors"
                          onClick={() => toggleCategory(item.category)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-number-sm font-medium ${percentOfIncome > 30 ? 'text-icon-pink' : percentOfIncome > 15 ? 'text-amber-500' : 'text-income'}`}>
                              {percentOfIncome.toFixed(0)}% av inkomst
                            </span>
                            <span className="text-number-sm font-medium">
                              {item.amount.toLocaleString("sv-SE")} kr
                            </span>
                          </div>
                        </div>

                        {/* Progress bar - shows percentage of income */}
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mx-2 mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${percentOfIncome > 30 ? 'bg-icon-pink' : percentOfIncome > 15 ? 'bg-amber-500' : 'bg-income'}`}
                            style={{ width: `${Math.min(percentOfIncome, 100)}%` }}
                          />
                        </div>

                        {isExpanded && (
                          <div className="mt-2 ml-6 space-y-1 border-l-2 border-border/40 pl-3 animate-fade-in">
                            {item.expenses.map((expense) => (
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
                                      month: "short"
                                    })}
                                  </p>
                                </div>
                                <span className="text-number-sm font-medium ml-3 flex-shrink-0">
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
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ArrowUpRight size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-caption">Inga utgifter för vald period</p>
                </div>
              )}
            </CardContent>
          </Card>
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
