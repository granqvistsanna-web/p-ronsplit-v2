import { useState, useMemo, useCallback } from "react";
import { HeaderMenu } from "@/components/HeaderMenu";
import { AddFab } from "@/components/AddFab";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { EditExpenseModal } from "@/components/EditExpenseModal";
import { EditIncomeModal } from "@/components/EditIncomeModal";
import { ImportModal } from "@/components/ImportModal";
import { SwishModal } from "@/components/SwishModal";
import { BalanceCard } from "@/components/BalanceCard";
import { MemberSummaryCard } from "@/components/MemberSummaryCard";
import { GroupSelector } from "@/components/GroupSelector";
import {
  DashboardSkeleton,
  HeroSummaryCard,
  LatestActivitiesCard,
  EmptyHouseholdState,
} from "@/components/dashboard";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { useIncomes, Income, IncomeInput } from "@/hooks/useIncomes";
import { useSettlements } from "@/hooks/useSettlements";
import { useAuth } from "@/hooks/useAuth";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useSidebar } from "@/hooks/useSidebar";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const { household, allGroups, loading: householdLoading, selectGroup } = useGroups();
  const { selectedYear, selectedMonth } = useMonthSelection();
  const { sidebarWidth } = useSidebar();

  const {
    expenses,
    loading: expensesLoading,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
  } = useExpenses({ groupId: household?.id || '' });

  const {
    incomes,
    loading: incomesLoading,
    addIncome,
    addIncomes,
    updateIncome,
    deleteIncome,
  } = useIncomes({ groupId: household?.id || '' });

  const {
    settlements,
    loading: settlementsLoading,
    addSettlement,
  } = useSettlements(household?.id);

  const [isSettling, setIsSettling] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSwishModalOpen, setIsSwishModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const loading = householdLoading || expensesLoading || incomesLoading || settlementsLoading;

  // Filter expenses and incomes by selected month
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === selectedYear &&
             expenseDate.getMonth() + 1 === selectedMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getFullYear() === selectedYear &&
             incomeDate.getMonth() + 1 === selectedMonth;
    });
  }, [incomes, selectedYear, selectedMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = filteredIncomes.reduce((sum, i) => sum + i.amount / 100, 0);
    const netto = totalIncomes - totalExpenses;
    return { totalExpenses, totalIncomes, netto };
  }, [filteredExpenses, filteredIncomes]);

  // Calculate percentages for visual bar
  const visualPercentages = useMemo(() => {
    const total = totals.totalIncomes + totals.totalExpenses;
    if (total === 0) return { incomeWidth: 50, expenseWidth: 50 };
    const incomeWidth = (totals.totalIncomes / total) * 100;
    const expenseWidth = (totals.totalExpenses / total) * 100;
    return { incomeWidth, expenseWidth };
  }, [totals]);

  // Animated percentages for bars
  const animatedIncomeWidth = useCountAnimation(visualPercentages.incomeWidth, { duration: 1200, delay: 150 });
  const animatedExpenseWidth = useCountAnimation(visualPercentages.expenseWidth, { duration: 1200, delay: 200 });

  // Combine and sort latest activities
  const latestActivities = useMemo(() => {
    const items: Array<{ type: 'expense' | 'income'; data: Expense | Income; date: string }> = [];

    filteredExpenses.forEach(expense => {
      items.push({ type: 'expense', data: expense, date: expense.date });
    });

    filteredIncomes.forEach(income => {
      items.push({ type: 'income', data: income, date: income.date });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [filteredExpenses, filteredIncomes]);

  // Handlers
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

  const handleImportIncomes = useCallback(async (newIncomes: IncomeInput[]) => {
    await addIncomes(newIncomes);
  }, [addIncomes]);

  const handleSettle = useCallback(async (fromUser: string, toUser: string, amount: number, date?: string) => {
    if (!household?.id) return;
    setIsSettling(true);
    try {
      const result = await addSettlement({
        group_id: household.id,
        from_user: fromUser,
        to_user: toUser,
        amount,
        date,
      });
      if (result) {
        toast.success("Avräkning registrerad!");
      } else {
        toast.error("Kunde inte registrera avräkning");
      }
    } catch (error) {
      console.error("Settlement failed:", error);
      toast.error("Kunde inte registrera avräkning");
    } finally {
      setIsSettling(false);
    }
  }, [household?.id, addSettlement]);

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setIsEditExpenseModalOpen(true);
  }, []);

  const handleEditIncome = useCallback((income: Income) => {
    setEditingIncome(income);
    setIsEditIncomeModalOpen(true);
  }, []);

  // Loading state
  if (loading) {
    return <DashboardSkeleton sidebarWidth={sidebarWidth} />;
  }

  // No household state
  if (!household) {
    return <EmptyHouseholdState sidebarWidth={sidebarWidth} />;
  }

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-heading text-xl sm:text-2xl">Hem</h1>
            <div className="flex items-center gap-2">
              <GroupSelector
                groups={allGroups}
                selectedGroupId={household.id}
                onSelectGroup={selectGroup}
              />
              <HeaderMenu
                onImportClick={() => setIsImportModalOpen(true)}
                onSwishClick={() => setIsSwishModalOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Hero Summary Card */}
        <HeroSummaryCard
          totalIncomes={totals.totalIncomes}
          totalExpenses={totals.totalExpenses}
          netto={totals.netto}
          animatedIncomeWidth={animatedIncomeWidth}
          animatedExpenseWidth={animatedExpenseWidth}
        />

        {/* Member summary */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '60ms' }}>
          <MemberSummaryCard
            expenses={filteredExpenses}
            incomes={filteredIncomes}
            members={household.members}
          />
        </div>

        {/* Balance section */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <BalanceCard
            expenses={filteredExpenses}
            incomes={filteredIncomes}
            members={household.members}
            settlements={settlements}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSettle={handleSettle}
            isSettling={isSettling}
          />
        </div>

        {/* Latest activities */}
        <LatestActivitiesCard
          activities={latestActivities}
          members={household.members}
          userId={user?.id}
          onEditExpense={handleEditExpense}
          onEditIncome={handleEditIncome}
          onAddClick={() => setIsAddModalOpen(true)}
        />
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

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportExpenses={handleImportExpenses}
        onImportIncomes={handleImportIncomes}
        groupId={household.id}
        currentUserId={user?.id || ""}
      />

      <SwishModal
        isOpen={isSwishModalOpen}
        onClose={() => setIsSwishModalOpen(false)}
        onSubmit={handleSettle}
        members={household.members}
        currentUserId={user?.id || ""}
      />

      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={async (updatedExpense) => {
          await updateExpense(updatedExpense.id, {
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            description: updatedExpense.description,
            date: updatedExpense.date,
            splits: updatedExpense.splits ?? null,
          });
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onDelete={async (expenseId) => {
          await deleteExpense(expenseId);
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        members={household.members}
      />

      <EditIncomeModal
        isOpen={isEditIncomeModalOpen}
        onClose={() => {
          setIsEditIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSave={async (updatedIncome) => {
          await updateIncome(updatedIncome.id, {
            amount: updatedIncome.amount,
            type: updatedIncome.type,
            note: updatedIncome.note,
            date: updatedIncome.date,
            repeat: updatedIncome.repeat,
            included_in_split: updatedIncome.included_in_split,
            recipient: updatedIncome.recipient,
          });
          setIsEditIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onDelete={async (incomeId) => {
          await deleteIncome(incomeId);
          setIsEditIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        income={editingIncome}
        members={household.members}
      />
    </div>
  );
};

export default Index;
