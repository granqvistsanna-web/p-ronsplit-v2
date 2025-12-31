import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddFab } from "@/components/AddFab";
import { PullToRefresh } from "@/components/PullToRefresh";
import { HeaderMenu } from "@/components/HeaderMenu";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { SwishModal } from "@/components/SwishModal";
import { ImportModal } from "@/components/ImportModal";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { useIncomes, Income, IncomeInput } from "@/hooks/useIncomes";
import { useSettlements, Settlement } from "@/hooks/useSettlements";
import { ExpenseItem } from "@/components/ExpenseItem";
import { IncomeItem } from "@/components/IncomeItem";
import { SettlementItem } from "@/components/SettlementItem";
import { EditExpenseModal } from "@/components/EditExpenseModal";
import { EditIncomeModal } from "@/components/EditIncomeModal";
import { EditSettlementModal } from "@/components/EditSettlementModal";
import { useAuth } from "@/hooks/useAuth";
import { Search, ArrowUpDown, Plus, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "date" | "amount" | "category";
type SortDirection = "asc" | "desc";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December"
];

export default function Aktivitet() {
  const { user } = useAuth();
  const { household, loading: householdLoading } = useGroups();
  const { expenses, loading: expensesLoading, updateExpense, deleteExpense, addExpense, addExpenses, refetch: refetchExpenses } = useExpenses(household?.id);
  const { incomes, loading: incomesLoading, updateIncome, deleteIncome, addIncome, refetch: refetchIncomes } = useIncomes(household?.id);
  const { settlements, loading: settlementsLoading, addSettlement, updateSettlement, deleteSettlement, refetch: refetchSettlements } = useSettlements(household?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSwishModalOpen, setIsSwishModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [isEditSettlementModalOpen, setIsEditSettlementModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);

  const loading = householdLoading || expensesLoading || incomesLoading || settlementsLoading;

  // Combine expenses, incomes and settlements
  const combinedItems = useMemo(() => {
    const items: Array<{
      type: 'expense' | 'income' | 'settlement';
      data: Expense | Income | Settlement;
      date: Date;
      amount: number;
      description: string;
      category?: string;
    }> = [];

    expenses.forEach(expense => {
      items.push({
        type: 'expense',
        data: expense,
        date: new Date(expense.date),
        amount: expense.amount,
        description: expense.description || expense.category,
        category: expense.category,
      });
    });

    incomes.forEach(income => {
      items.push({
        type: 'income',
        data: income,
        date: new Date(income.date),
        amount: income.amount / 100,
        description: income.note || 'Inkomst',
      });
    });

    settlements.forEach(settlement => {
      items.push({
        type: 'settlement',
        data: settlement,
        date: new Date(settlement.date),
        amount: settlement.amount,
        description: 'Swish',
      });
    });

    return items;
  }, [expenses, incomes, settlements]);

  // Filter by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return combinedItems;

    const query = searchQuery.toLowerCase();
    return combinedItems.filter(item => {
      const description = item.description.toLowerCase();
      const category = item.category?.toLowerCase() || '';
      const amount = item.amount.toString();

      return description.includes(query) || category.includes(query) || amount.includes(query);
    });
  }, [combinedItems, searchQuery]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "category":
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredItems, sortBy, sortDirection]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, typeof sortedItems>();

    // Efficiently group items by pushing to arrays
    sortedItems.forEach(item => {
      const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(item);
    });

    // Sort month keys in descending order (newest first)
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(key => ({
      monthKey: key,
      items: groups.get(key) || [],
    }));
  }, [sortedItems]);

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditExpenseModalOpen(true);
  };

  const handleSaveExpense = async (updatedExpense: Expense) => {
    await updateExpense(updatedExpense.id, {
      amount: updatedExpense.amount,
      category: updatedExpense.category,
      description: updatedExpense.description,
      date: updatedExpense.date,
    });
    setIsEditExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setIsEditIncomeModalOpen(true);
  };

  const handleSaveIncome = async (updatedIncome: Income) => {
    await updateIncome(updatedIncome.id, {
      amount: updatedIncome.amount,
      recipient: updatedIncome.recipient,
      type: updatedIncome.type,
      note: updatedIncome.note,
      date: updatedIncome.date,
      repeat: updatedIncome.repeat,
      included_in_split: updatedIncome.included_in_split,
    });
    setIsEditIncomeModalOpen(false);
    setEditingIncome(null);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    await deleteIncome(incomeId);
  };

  const handleEditSettlement = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setIsEditSettlementModalOpen(true);
  };

  const handleSaveSettlement = async (updatedSettlement: Settlement) => {
    await updateSettlement(updatedSettlement.id, {
      from_user: updatedSettlement.from_user,
      to_user: updatedSettlement.to_user,
      amount: updatedSettlement.amount,
      date: updatedSettlement.date,
    });
    setIsEditSettlementModalOpen(false);
    setEditingSettlement(null);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    await deleteSettlement(settlementId);
    setIsEditSettlementModalOpen(false);
    setEditingSettlement(null);
  };

  const handleAddSwish = useCallback(async (fromUser: string, toUser: string, amount: number, date: string) => {
    if (!household?.id) return;
    await addSettlement({
      group_id: household.id,
      from_user: fromUser,
      to_user: toUser,
      amount,
      date,
    });
  }, [household?.id, addSettlement]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  const handleAddExpense = useCallback(async (newExpense: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
  }) => {
    await addExpense(newExpense);
  }, [addExpense]);

  const handleAddIncome = useCallback(async (newIncome: IncomeInput) => {
    return await addIncome(newIncome);
  }, [addIncome]);

  const handleImportExpenses = useCallback(async (newExpenses: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
  }[]) => {
    await addExpenses(newExpenses);
  }, [addExpenses]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchExpenses(), refetchIncomes(), refetchSettlements()]);
  }, [refetchExpenses, refetchIncomes, refetchSettlements]);

  if (loading) {
    return (
      <div className="pt-14 lg:pt-0 lg:pl-64">
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="h-8 w-32 rounded-md skeleton-shimmer mb-6" />
          <div className="h-24 rounded-lg skeleton-shimmer mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-6 w-32 rounded-md skeleton-shimmer mb-3" />
                <div className="h-32 rounded-lg skeleton-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
              </div>
            ))}
          </div>
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
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <p className="text-caption">Inget hushåll hittades.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="pt-14 lg:pt-0 lg:pl-64">
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-heading text-2xl">Aktivitet</h1>
            <HeaderMenu
              onImportClick={() => setIsImportModalOpen(true)}
              onSwishClick={() => setIsSwishModalOpen(true)}
            />
          </div>
        </div>

        {/* Search and filters - sticky on mobile */}
        <div className="mb-6 animate-fade-in bg-card rounded-lg p-3 sm:p-4 sticky top-14 lg:top-0 z-10 shadow-sm" style={{ animationDelay: '50ms' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Sök aktivitet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {/* Sort options */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-9 w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Datum</SelectItem>
                  <SelectItem value="amount">Summa</SelectItem>
                  <SelectItem value="category">Kategori</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={toggleSortDirection} className="h-9 w-9 shrink-0">
                <ArrowUpDown size={16} />
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-2 text-caption text-xs">
            {filteredItems.length} {filteredItems.length === 1 ? 'aktivitet' : 'aktiviteter'}
            {searchQuery && ` för "${searchQuery}"`}
          </div>
        </div>

        {/* Activity list grouped by month */}
        <PullToRefresh onRefresh={handleRefresh}>
          {groupedByMonth.length > 0 ? (
            <div className="space-y-6">
            {groupedByMonth.map(({ monthKey, items }, groupIdx) => {
              const [year, month] = monthKey.split('-');
              const monthName = MONTHS[parseInt(month) - 1];
              const totalExpenses = items.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
              const totalIncomes = items.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);

              return (
                <div 
                  key={monthKey} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${100 + groupIdx * 50}ms` }}
                >
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {monthName} {year}
                    </h2>
                    <div className="flex gap-3 text-xs font-medium tabular-nums">
                      <span className="text-income">
                        +{totalIncomes.toLocaleString("sv-SE")}
                      </span>
                      <span className="text-expense">
                        -{totalExpenses.toLocaleString("sv-SE")}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-border/30">
                    {items.map((item, index) => {
                      if (item.type === 'expense') {
                        const expense = item.data as Expense;
                        return (
                          <ExpenseItem
                            key={`expense-${expense.id}`}
                            expense={expense}
                            members={household.members}
                            index={index}
                            onEdit={handleEditExpense}
                            onDelete={handleDeleteExpense}
                            currentUserId={user?.id}
                          />
                        );
                      } else if (item.type === 'income') {
                        const income = item.data as Income;
                        return (
                          <IncomeItem
                            key={`income-${income.id}`}
                            income={income}
                            members={household.members}
                            onEdit={handleEditIncome}
                            onDelete={handleDeleteIncome}
                            currentUserId={user?.id}
                          />
                        );
                      } else {
                        const settlement = item.data as Settlement;
                        return (
                          <SettlementItem
                            key={`settlement-${settlement.id}`}
                            settlement={settlement}
                            members={household.members}
                            index={index}
                            onEdit={handleEditSettlement}
                            currentUserId={user?.id}
                          />
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="rounded-full bg-card p-5 mb-5">
              <Plus size={28} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground text-lg mb-2">Inga aktiviteter</p>
            <p className="text-caption text-center mb-6 max-w-xs">
              {searchQuery ? 'Inga resultat matchade din sökning' : 'Börja genom att lägga till din första utgift eller inkomst'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2"
              >
                <Plus size={18} />
                Lägg till transaktion
              </Button>
            )}
          </div>
        )}
        </PullToRefresh>
      </main>

      {/* Add FAB */}
      <AddFab onClick={() => setIsAddModalOpen(true)} />

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddExpense={handleAddExpense}
        onAddIncome={handleAddIncome}
        groupId={household.id}
        members={household.members}
        defaultType="expense"
      />

      <SwishModal
        isOpen={isSwishModalOpen}
        onClose={() => setIsSwishModalOpen(false)}
        onSubmit={handleAddSwish}
        members={household.members}
        currentUserId={user?.id || ""}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportExpenses={handleImportExpenses}
        groupId={household.id}
        currentUserId={user?.id || ""}
      />

      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        expense={editingExpense}
        members={household.members}
      />

      <EditIncomeModal
        isOpen={isEditIncomeModalOpen}
        onClose={() => {
          setIsEditIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSave={handleSaveIncome}
        onDelete={handleDeleteIncome}
        income={editingIncome}
        members={household.members}
      />

      <EditSettlementModal
        isOpen={isEditSettlementModalOpen}
        onClose={() => {
          setIsEditSettlementModalOpen(false);
          setEditingSettlement(null);
        }}
        onSave={handleSaveSettlement}
        onDelete={handleDeleteSettlement}
        settlement={editingSettlement}
        members={household.members}
      />
    </div>
  );
}