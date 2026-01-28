import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repeat } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import type { Expense, GroupMember } from "@/lib/types";
import type { Income } from "@/hooks/useIncomes";
import { öreToKr } from "@/lib/types";

type RecurringItem =
  | { type: "expense"; data: Expense }
  | { type: "income"; data: Income };

interface RecurringItemCardProps {
  categoryId: string;
  items: RecurringItem[];
  monthlyTotal: number;
  members: GroupMember[];
  onEditExpense?: (expense: Expense) => void;
  onEditIncome?: (income: Income) => void;
}

export const RecurringItemCard = memo(function RecurringItemCard({
  categoryId,
  items,
  monthlyTotal,
  members,
  onEditExpense,
  onEditIncome,
}: RecurringItemCardProps) {
  const category = DEFAULT_CATEGORIES.find(c => c.id === categoryId)
    || { id: categoryId, name: categoryId, icon: "📦", color: "hsl(0, 0%, 50%)" };

  const getMemberName = (userId: string): string => {
    const member = members.find(m => m.user_id === userId);
    return member?.name || "Okänd";
  };

  const handleClick = (item: RecurringItem) => {
    if (item.type === "expense" && onEditExpense) {
      onEditExpense(item.data);
    } else if (item.type === "income" && onEditIncome) {
      onEditIncome(item.data);
    }
  };

  const getRepeatLabel = (repeat: string) => {
    switch (repeat) {
      case "monthly":
        return "Månadsvis";
      case "yearly":
        return "Årsvis";
      default:
        return "";
    }
  };

  const getAmount = (item: RecurringItem): number => {
    if (item.type === "expense") {
      return item.data.amount;
    }
    // Income is stored in öre
    return öreToKr(item.data.amount);
  };

  const getMonthlyAmount = (item: RecurringItem): number => {
    const amount = getAmount(item);
    if (item.type === "expense" && item.data.repeat === "yearly") {
      return amount / 12;
    }
    return amount;
  };

  const getDescription = (item: RecurringItem): string => {
    if (item.type === "expense") {
      return item.data.description || "Utgift";
    }
    return item.data.note || "Inkomst";
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{category.icon}</span>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {category.name}
            </CardTitle>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {monthlyTotal.toLocaleString("sv-SE")} kr
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-0.5">
          {items.map((item) => {
            const id = item.type === "expense" ? item.data.id : item.data.id;
            const amount = getAmount(item);
            const monthlyAmount = getMonthlyAmount(item);
            const isYearly = item.type === "expense" && item.data.repeat === "yearly";
            const repeat = item.type === "expense" ? item.data.repeat : item.data.repeat;
            const memberName = item.type === "expense"
              ? getMemberName(item.data.paid_by)
              : getMemberName(item.data.recipient);

            return (
              <button
                key={id}
                onClick={() => handleClick(item)}
                className="w-full text-left flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground truncate">
                      {getDescription(item)}
                    </p>
                    <Repeat size={14} className="text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {memberName} · {getRepeatLabel(repeat)}
                    {isYearly && ` (${amount.toLocaleString("sv-SE")} kr/år)`}
                  </p>
                </div>
                <span className={`text-sm font-medium tabular-nums shrink-0 ${
                  item.type === "income" ? "text-income" : ""
                }`}>
                  {item.type === "income" ? "+" : ""}
                  {isYearly
                    ? `~${Math.round(monthlyAmount).toLocaleString("sv-SE")}`
                    : monthlyAmount.toLocaleString("sv-SE")
                  } kr
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
