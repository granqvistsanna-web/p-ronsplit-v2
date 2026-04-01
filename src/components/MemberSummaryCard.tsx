import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Expense } from "@/hooks/useExpenses";
import { Income } from "@/hooks/useIncomes";
import { GroupMember } from "@/hooks/useGroups";
import { toKronor } from "@/lib/currency";

interface MemberSummaryCardProps {
  expenses: Expense[];
  incomes: Income[];
  members: GroupMember[];
  onMemberClick?: (memberId: string) => void;
}

export const MemberSummaryCard = ({
  expenses,
  incomes,
  members,
  onMemberClick,
}: MemberSummaryCardProps) => {
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
            {memberSummaries.map((member, idx) => (
              <div
                key={member.user_id}
                className={`p-4 transition-colors ${
                  onMemberClick
                    ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                    : ""
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => onMemberClick?.(member.user_id)}
              >
                {/* Member name */}
                <div className="mb-3">
                  <p className="font-medium text-foreground">{member.name}</p>
                </div>

                {/* Income and expense summary */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Income */}
                  <div className="space-y-1">
                    <p className="text-label-mono">
                      Inkomst
                    </p>
                    <p className="text-number-lg text-income">
                      {Math.round(member.totalIncomes).toLocaleString("sv-SE")} kr
                    </p>
                  </div>

                  {/* Expense */}
                  <div className="space-y-1">
                    <p className="text-label-mono">
                      Utgift
                    </p>
                    <p className="text-number-lg text-expense">
                      {Math.round(member.totalExpenses).toLocaleString("sv-SE")} kr
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
