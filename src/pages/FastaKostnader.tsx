import { useState, useMemo } from "react";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { useIncomes, Income } from "@/hooks/useIncomes";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/useAuth";
import { RecurringSummaryCard, RecurringItemCard } from "@/components/recurring";
import { EditExpenseModal } from "@/components/EditExpenseModal";
import { EditIncomeModal } from "@/components/EditIncomeModal";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { toKronor } from "@/lib/currency";
import { getIncomeTypeLabel, getIncomeTypeIcon } from "@/lib/incomeUtils";
import { Repeat } from "lucide-react";

type RecurringItem =
  | { type: "expense"; data: Expense }
  | { type: "income"; data: Income };

interface CategoryGroup {
  categoryId: string;
  items: RecurringItem[];
  monthlyTotal: number;
}

export default function FastaKostnader() {
  const { user } = useAuth();
  const { household, loading: householdLoading } = useGroups();
  const { expenses, loading: expensesLoading, updateExpense, deleteExpense } = useExpenses({ groupId: household?.id || '' });
  const { incomes, loading: incomesLoading, updateIncome, deleteIncome } = useIncomes({ groupId: household?.id || '' });
  const { sidebarWidth } = useSidebar();

  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const loading = householdLoading || expensesLoading || incomesLoading;

  // Filter recurring transactions
  const recurringExpenses = useMemo(() => {
    return expenses.filter(e => e.repeat !== "none");
  }, [expenses]);

  const recurringIncomes = useMemo(() => {
    return incomes.filter(i => i.repeat !== "none");
  }, [incomes]);

  // Calculate monthly amounts
  const getMonthlyExpenseAmount = (expense: Expense): number => {
    if (expense.repeat === "yearly") {
      return expense.amount / 12;
    }
    return expense.amount;
  };

  const getMonthlyIncomeAmount = (income: Income): number => {
    // Income is stored in öre
    return toKronor(income.amount);
  };

  // Group expenses by category
  const expensesByCategory = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, RecurringItem[]>();

    recurringExpenses.forEach(expense => {
      const categoryId = expense.category || 'ovrigt';
      if (!groups.has(categoryId)) {
        groups.set(categoryId, []);
      }
      groups.get(categoryId)!.push({ type: "expense", data: expense });
    });

    return Array.from(groups.entries())
      .map(([categoryId, items]) => {
        const monthlyTotal = items.reduce((sum, item) => {
          if (item.type === "expense") {
            return sum + getMonthlyExpenseAmount(item.data);
          }
          return sum;
        }, 0);

        return { categoryId, items, monthlyTotal };
      })
      .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
  }, [recurringExpenses]);

  // Group incomes by type
  const incomesByType = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, RecurringItem[]>();

    recurringIncomes.forEach(income => {
      const typeId = income.type || 'other';
      if (!groups.has(typeId)) {
        groups.set(typeId, []);
      }
      groups.get(typeId)!.push({ type: "income", data: income });
    });

    return Array.from(groups.entries())
      .map(([typeId, items]) => {
        const monthlyTotal = items.reduce((sum, item) => {
          if (item.type === "income") {
            return sum + getMonthlyIncomeAmount(item.data);
          }
          return sum;
        }, 0);

        return { categoryId: typeId, items, monthlyTotal };
      })
      .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
  }, [recurringIncomes]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalExpenses = recurringExpenses.reduce((sum, e) => sum + getMonthlyExpenseAmount(e), 0);
    const totalIncomes = recurringIncomes.reduce((sum, i) => sum + getMonthlyIncomeAmount(i), 0);
    return { totalExpenses, totalIncomes };
  }, [recurringExpenses, recurringIncomes]);

  // Handlers
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditExpenseModalOpen(true);
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setIsEditIncomeModalOpen(true);
  };

  const handleSaveExpense = async (updatedExpense: Expense) => {
    await updateExpense(updatedExpense.id, {
      amount: updatedExpense.amount,
      category: updatedExpense.category,
      description: updatedExpense.description,
      date: updatedExpense.date,
      splits: updatedExpense.splits ?? null,
      repeat: updatedExpense.repeat,
    });
    setIsEditExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleSaveIncome = async (updatedIncome: Income) => {
    await updateIncome(updatedIncome.id, {
      amount: updatedIncome.amount,
      type: updatedIncome.type,
      note: updatedIncome.note,
      date: updatedIncome.date,
      repeat: updatedIncome.repeat,
      included_in_split: updatedIncome.included_in_split,
    });
    setIsEditIncomeModalOpen(false);
    setEditingIncome(null);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    setIsEditExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    await deleteIncome(incomeId);
    setIsEditIncomeModalOpen(false);
    setEditingIncome(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="mb-6">
            <div className="h-8 w-48 rounded-md skeleton-shimmer mb-2" />
            <div className="h-4 w-72 rounded-md skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg skeleton-shimmer" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          <div className="h-32 rounded-lg skeleton-shimmer mb-4" />
          <div className="h-32 rounded-lg skeleton-shimmer" />
        </main>
      </div>
    );
  }

  // No household state
  if (!household) {
    return (
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="rounded-full bg-muted p-5 mb-4">
              <Repeat className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              Inget hushåll valt
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Välj ett hushåll för att se dina återkommande transaktioner
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Empty state
  const hasRecurring = recurringExpenses.length > 0 || recurringIncomes.length > 0;

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">Återkommande</h1>
          <p className="text-muted-foreground mt-1">
            Översikt över dina återkommande utgifter och inkomster
          </p>
        </div>

        {!hasRecurring ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="rounded-full bg-muted p-5 mb-4">
              <Repeat className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              Inga återkommande transaktioner
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Markera utgifter eller inkomster som återkommande för att se dem här
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-8 animate-fade-in" style={{ animationDelay: '20ms' }}>
              <RecurringSummaryCard
                totalExpenses={totals.totalExpenses}
                totalIncomes={totals.totalIncomes}
              />
            </div>

            {/* Expenses Section */}
            {expensesByCategory.length > 0 && (
              <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Utgifter
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {expensesByCategory.map((group, idx) => (
                    <div key={group.categoryId} style={{ animationDelay: `${120 + idx * 20}ms` }}>
                      <RecurringItemCard
                        categoryId={group.categoryId}
                        items={group.items}
                        monthlyTotal={group.monthlyTotal}
                        members={household?.members || []}
                        onEditExpense={handleEditExpense}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incomes Section */}
            {incomesByType.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Inkomster
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {incomesByType.map((group, idx) => (
                    <div key={group.categoryId} style={{ animationDelay: `${220 + idx * 20}ms` }}>
                      <IncomeGroupCard
                        typeId={group.categoryId}
                        items={group.items}
                        monthlyTotal={group.monthlyTotal}
                        members={household?.members || []}
                        onEditIncome={handleEditIncome}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        expense={editingExpense}
        members={household?.members || []}
      />

      {/* Edit Income Modal */}
      <EditIncomeModal
        isOpen={isEditIncomeModalOpen}
        onClose={() => {
          setIsEditIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSave={handleSaveIncome}
        onDelete={handleDeleteIncome}
        income={editingIncome}
        members={household?.members || []}
      />
    </div>
  );
}

// Income-specific card component
interface IncomeGroupCardProps {
  typeId: string;
  items: RecurringItem[];
  monthlyTotal: number;
  members: { user_id: string; name: string }[];
  onEditIncome?: (income: Income) => void;
}

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IncomeGroupCard = memo(function IncomeGroupCard({
  typeId,
  items,
  monthlyTotal,
  members,
  onEditIncome,
}: IncomeGroupCardProps) {
  const icon = getIncomeTypeIcon(typeId);
  const label = getIncomeTypeLabel(typeId);

  const getMemberName = (userId: string): string => {
    const member = members.find(m => m.user_id === userId);
    return member?.name || "Okänd";
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {label}
            </CardTitle>
          </div>
          <span className="text-sm font-semibold tabular-nums text-income">
            +{monthlyTotal.toLocaleString("sv-SE")} kr
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-0.5">
          {items.map((item) => {
            if (item.type !== "income") return null;
            const income = item.data;
            const amount = toKronor(income.amount);
            const memberName = getMemberName(income.recipient);

            return (
              <button
                key={income.id}
                onClick={() => onEditIncome?.(income)}
                className="w-full text-left flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground truncate">
                      {income.note || "Inkomst"}
                    </p>
                    <Repeat size={14} className="text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {memberName} · Månadsvis
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums shrink-0 text-income">
                  +{amount.toLocaleString("sv-SE")} kr
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
