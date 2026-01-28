import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpenseItem } from "@/components/ExpenseItem";
import type { Expense, GroupMember } from "@/lib/types";

interface TransactionListProps {
  expenses: Expense[];
  categoryId: string;
  members: GroupMember[];
  onEdit?: (expense: Expense) => void;
  currentUserId?: string;
}

export function TransactionList({
  expenses,
  categoryId,
  members,
  onEdit,
  currentUserId,
}: TransactionListProps) {
  // Filter expenses by selected category
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.category === categoryId),
    [expenses, categoryId]
  );

  // Empty state
  if (filteredExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Inga transaktioner i denna kategori
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {filteredExpenses.map((expense, idx) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            members={members}
            index={idx}
            onEdit={onEdit}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
