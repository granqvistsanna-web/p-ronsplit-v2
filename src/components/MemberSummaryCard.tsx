import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Expense } from "@/hooks/useExpenses";
import { Income } from "@/hooks/useIncomes";
import { GroupMember } from "@/hooks/useGroups";
import { toKronor } from "@/lib/currency";
import { ExpenseItem } from "@/components/ExpenseItem";
import { IncomeItem } from "@/components/IncomeItem";

interface MemberSummaryCardProps {
  expenses: Expense[];
  incomes: Income[];
  members: GroupMember[];
  onMemberClick?: (memberId: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onEditIncome?: (income: Income) => void;
  currentUserId?: string;
}

export const MemberSummaryCard = ({
  expenses,
  incomes,
  members,
  onMemberClick,
  onEditExpense,
  onEditIncome,
  currentUserId,
}: MemberSummaryCardProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const memberSummaries = useMemo(() => {
    // Pre-aggregate expenses by user (O(n))
    const expensesByUser = new Map<string, number>();
    expenses.forEach((e) => {
      expensesByUser.set(e.paid_by, (expensesByUser.get(e.paid_by) || 0) + e.amount);
    });

    // Pre-aggregate incomes by user (O(n)) - amount is in öre
    const incomesByUser = new Map<string, number>();
    incomes.filter(i => i.included_in_split).forEach((i) => {
      incomesByUser.set(i.recipient, (incomesByUser.get(i.recipient) || 0) + toKronor(i.amount));
    });

    // Now lookup is O(1) per member
    return members.map((member) => ({
      ...member,
      totalExpenses: expensesByUser.get(member.user_id) || 0,
      totalIncomes: incomesByUser.get(member.user_id) || 0,
    }));
  }, [expenses, incomes, members]);

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-label-mono">Per medlem</h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {memberSummaries.map((member, idx) => {
              const isExpanded = expandedId === member.user_id;
              const memberExpenses = expenses
                .filter((e) => e.paid_by === member.user_id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const memberIncomes = incomes
                .filter((i) => i.recipient === member.user_id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div key={member.user_id} style={{ animationDelay: `${idx * 50}ms` }}>
                  <button
                    type="button"
                    className="w-full text-left p-4 transition-colors cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : member.user_id);
                      onMemberClick?.(member.user_id);
                    }}
                    aria-expanded={isExpanded}
                  >
                    {/* Member name */}
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium text-foreground">{member.name}</p>
                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {/* Income and expense summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-label-mono">Inkomst</p>
                        <p className="text-number-lg text-income">
                          {Math.round(member.totalIncomes).toLocaleString("sv-SE")} kr
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-label-mono">Utgift</p>
                        <p className="text-number-lg text-expense">
                          {Math.round(member.totalExpenses).toLocaleString("sv-SE")} kr
                        </p>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-muted/20"
                      >
                        <div className="px-4 pb-4 pt-2 space-y-4">
                          {/* Incomes */}
                          <div>
                            <p className="text-label-mono mb-1">
                              Inkomster ({memberIncomes.length})
                            </p>
                            {memberIncomes.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                Inga inkomster i perioden
                              </p>
                            ) : (
                              <div className="divide-y divide-border/40">
                                {memberIncomes.map((income) => (
                                  <IncomeItem
                                    key={income.id}
                                    income={income}
                                    members={members}
                                    onEdit={onEditIncome}
                                    currentUserId={currentUserId}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Expenses */}
                          <div>
                            <p className="text-label-mono mb-1">
                              Utgifter ({memberExpenses.length})
                            </p>
                            {memberExpenses.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                Inga utgifter i perioden
                              </p>
                            ) : (
                              <div className="divide-y divide-border/40">
                                {memberExpenses.map((expense, i) => (
                                  <ExpenseItem
                                    key={expense.id}
                                    expense={expense}
                                    members={members}
                                    index={i}
                                    onEdit={onEditExpense}
                                    currentUserId={currentUserId}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
