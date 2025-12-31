import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Expense } from "@/hooks/useExpenses";
import { Income } from "@/hooks/useIncomes";
import { GroupMember } from "@/hooks/useGroups";

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
    return members.map((member) => {
      // Sum expenses paid by this member
      const totalExpenses = expenses
        .filter((e) => e.paid_by === member.user_id)
        .reduce((sum, e) => sum + e.amount, 0);

      // Sum incomes received by this member (amount is in öre)
      const totalIncomes = incomes
        .filter((i) => i.recipient === member.user_id)
        .reduce((sum, i) => sum + i.amount / 100, 0);

      return {
        ...member,
        totalExpenses,
        totalIncomes,
      };
    });
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
                      {member.totalIncomes.toLocaleString("sv-SE")} kr
                    </p>
                  </div>

                  {/* Expense */}
                  <div className="space-y-1">
                    <p className="text-label-mono">
                      Utgift
                    </p>
                    <p className="text-number-lg text-expense">
                      {member.totalExpenses.toLocaleString("sv-SE")} kr
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
