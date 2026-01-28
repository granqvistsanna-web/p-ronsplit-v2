import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses } from "@/hooks/useExpenses";
import { useIncomes } from "@/hooks/useIncomes";
import { useSidebar } from "@/hooks/useSidebar";
import { BarChart3, ArrowUpRight, ChevronDown, ChevronRight, ChevronLeft, Calendar, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendChart, CategoryDonut, CategoryLegend, ComparisonBar } from "@/components/analytics";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December"
];

export default function Analys() {
  const { household, loading: householdLoading } = useGroups();
  const { expenses, loading: expensesLoading } = useExpenses(household?.id);
  const { incomes, loading: incomesLoading } = useIncomes(household?.id);
  const { sidebarWidth } = useSidebar();

  const currentDate = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

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

  // Calculate previous month totals for comparison
  const previousMonthTotals = useMemo(() => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    const prevExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getFullYear() === prevYear && date.getMonth() + 1 === prevMonth;
    });
    const prevIncomes = incomes.filter(i => {
      const date = new Date(i.date);
      return date.getFullYear() === prevYear && date.getMonth() + 1 === prevMonth;
    });

    const totalExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = prevIncomes.reduce((sum, i) => sum + i.amount / 100, 0);
    const netto = totalIncomes - totalExpenses;

    return { totalExpenses, totalIncomes, netto };
  }, [expenses, incomes, selectedYear, selectedMonth]);

  // Calculate percentage changes
  const changes = useMemo(() => {
    const incomeChange = previousMonthTotals.totalIncomes > 0
      ? ((totals.totalIncomes - previousMonthTotals.totalIncomes) / previousMonthTotals.totalIncomes) * 100
      : totals.totalIncomes > 0 ? 100 : 0;

    const expenseChange = previousMonthTotals.totalExpenses > 0
      ? ((totals.totalExpenses - previousMonthTotals.totalExpenses) / previousMonthTotals.totalExpenses) * 100
      : totals.totalExpenses > 0 ? 100 : 0;

    const nettoChange = previousMonthTotals.netto !== 0
      ? totals.netto - previousMonthTotals.netto
      : totals.netto;

    return { incomeChange, expenseChange, nettoChange };
  }, [totals, previousMonthTotals]);

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

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);


  // Navigation functions - memoized to prevent unnecessary re-renders
  const goToCurrentMonth = useCallback(() => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
  }, [currentDate]);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      if (prevMonth === 1) {
        setSelectedYear(prevYear => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prevMonth => {
      if (prevMonth === 12) {
        setSelectedYear(prevYear => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }, []);

  const isCurrentMonth = selectedYear === currentDate.getFullYear() && 
                        selectedMonth === currentDate.getMonth() + 1;

  const handleMonthYearChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const currentMonthYearValue = `${selectedYear}-${selectedMonth}`;

  // Keyboard navigation for time filter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Arrow keys for month navigation (Cmd/Ctrl + Arrow)
      if (event.key === "ArrowLeft" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        goToPreviousMonth();
      } else if (event.key === "ArrowRight" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!isCurrentMonth) {
          goToNextMonth();
        }
      } else if (event.key === "Home" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        goToCurrentMonth();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth]);

  // Optimize monthYearOptions with better memoization
  const monthYearOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; month: number; year: number }> = [];
    const startYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Generate options: current year + previous 2 years, all months
    for (let year = startYear; year >= startYear - 2; year--) {
      for (let month = 12; month >= 1; month--) {
        // Only show past and current months (not future)
        const isFuture = year > startYear || (year === startYear && month > currentMonth);
        if (!isFuture) {
          options.push({
            value: `${year}-${month}`,
            label: `${MONTHS[month - 1]} ${year}`,
            month,
            year
          });
        }
      }
    }
    
    return options;
  }, [currentDate]);

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

        {/* Time Filter - Expert UX Optimized */}
        <div 
          ref={filterRef}
          className="mb-6 animate-fade-in" 
          style={{ animationDelay: '20ms' }}
          role="group"
          aria-label="Tidsfilter för analys"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
            {/* Previous month button - optimized */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-9 w-9 p-0 flex-shrink-0 [touch-action:manipulation] transition-all duration-150 hover:bg-accent hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-1"
              aria-label="Föregående månad"
              title="Föregående månad (⌘←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Combined Month/Year Selector - optimized */}
            <div className="flex-1 min-w-0">
              <Select
                value={currentMonthYearValue}
                onValueChange={handleMonthYearChange}
              >
                <SelectTrigger 
                  className="h-9 w-full text-sm font-medium [touch-action:manipulation] transition-all duration-150 hover:border-foreground/20 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-1"
                  aria-label="Välj månad och år"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <SelectValue className="font-medium truncate">
                      {MONTHS[selectedMonth - 1]} {selectedYear}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {monthYearOptions.map((option) => {
                    const isCurrent = option.year === currentDate.getFullYear() && 
                                     option.month === currentDate.getMonth() + 1;
                    const isSelected = option.value === currentMonthYearValue;
                    return (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className={`transition-colors cursor-pointer ${
                          isCurrent ? "font-medium" : ""
                        } ${
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{option.label}</span>
                          {isCurrent && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                              Nuvarande
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Next month button - optimized */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="h-9 w-9 p-0 flex-shrink-0 [touch-action:manipulation] transition-all duration-150 hover:bg-accent hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-1"
              aria-label="Nästa månad"
              title={isCurrentMonth ? "Redan på nuvarande månad" : "Nästa månad (⌘→)"}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Quick action: Current month - only when needed */}
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentMonth}
                className="h-9 text-xs px-2.5 flex-shrink-0 [touch-action:manipulation] transition-all duration-150 hover:bg-primary/10 hover:text-primary active:scale-95 rounded-md font-medium focus-visible:ring-2 focus-visible:ring-offset-1"
                title="Gå till nuvarande månad (⌘Home)"
                aria-label="Gå till nuvarande månad"
              >
                <span className="whitespace-nowrap">
                  <span className="hidden sm:inline">Nuvarande</span>
                  <span className="sm:hidden">Nu</span>
                </span>
              </Button>
            )}
          </div>
          
          {/* Keyboard shortcut hint - subtle, only on desktop */}
          <p className="text-xs text-muted-foreground mt-2 hidden lg:block">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono ml-1">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono ml-1">→</kbd>
            {" "}för att navigera
          </p>
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
              {previousMonthTotals.totalIncomes > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className={`flex items-center gap-1.5 text-xs ${
                    changes.incomeChange >= 0 ? 'text-income' : 'text-icon-pink'
                  }`}>
                    <span className="font-medium">
                      {changes.incomeChange >= 0 ? '+' : ''}{changes.incomeChange.toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground">vs förra månaden</span>
                  </div>
                </div>
              )}
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
              {previousMonthTotals.totalExpenses > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className={`flex items-center gap-1.5 text-xs ${
                    changes.expenseChange <= 0 ? 'text-income' : 'text-icon-pink'
                  }`}>
                    <span className="font-medium">
                      {changes.expenseChange >= 0 ? '+' : ''}{changes.expenseChange.toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground">vs förra månaden</span>
                  </div>
                </div>
              )}
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
              {(previousMonthTotals.totalIncomes > 0 || previousMonthTotals.totalExpenses > 0) && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className={`flex items-center gap-1.5 text-xs ${
                    changes.nettoChange >= 0 ? 'text-income' : 'text-icon-pink'
                  }`}>
                    <span className="font-medium">
                      {changes.nettoChange >= 0 ? '+' : ''}{changes.nettoChange.toLocaleString("sv-SE")} kr
                    </span>
                    <span className="text-muted-foreground">vs förra månaden</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                selectedMonth={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
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
                selectedMonth={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
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

        {/* Category Breakdown with Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '140ms' }}>
          {/* Donut Chart Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart size={18} className="text-muted-foreground" />
                Kategorifördelning
              </CardTitle>
              <p className="text-caption mt-1">
                {MONTHS[selectedMonth - 1]} {selectedYear}
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
                Andel av inkomst • Klicka för detaljer
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
    </div>
  );
}