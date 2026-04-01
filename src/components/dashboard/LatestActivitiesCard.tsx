import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Smartphone, Plus, AlertCircle } from "lucide-react";
import { toKronor } from "@/lib/currency";
import type { Expense, Settlement } from "@/lib/types";
import type { Income } from "@/hooks/useIncomes";
import type { GroupMember } from "@/hooks/useGroups";

interface ActivityItem {
  type: 'expense' | 'income' | 'settlement';
  data: Expense | Income | Settlement;
  date: string;
}

interface LatestActivitiesCardProps {
  activities: ActivityItem[];
  members: GroupMember[];
  userId?: string;
  onEditExpense: (expense: Expense) => void;
  onEditIncome: (income: Income) => void;
  onAddClick: () => void;
  highlightedIds?: Set<string>;
}

export const LatestActivitiesCard = ({
  activities,
  members,
  userId,
  onEditExpense,
  onEditIncome,
  onAddClick,
  highlightedIds,
}: LatestActivitiesCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label-mono">
          Senaste aktiviteter
        </h2>
        <button
          onClick={() => navigate("/aktivitet")}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Se alla
          <ArrowRight size={16} />
        </button>
      </div>

      {activities.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {activities.map((item, idx) => {
                if (item.type === 'expense') {
                  const expense = item.data as Expense;
                  const canEdit = !!userId;
                  const isHighlighted = highlightedIds?.has(expense.id);

                  return (
                    <div
                      key={`expense-${expense.id}`}
                      className={`group p-3.5 list-hover rounded-lg ${canEdit ? "cursor-pointer" : "cursor-default opacity-90"} ${isHighlighted ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={() => {
                        if (!canEdit) return;
                        onEditExpense(expense);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-expense-bg shrink-0">
                          <ArrowUpRight size={16} className="text-expense" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{expense.description || expense.category}</p>
                          <p className="text-caption flex items-center gap-1">
                            {members.find(m => m.user_id === expense.paid_by)?.name} •{' '}
                            {new Date(expense.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                            {isHighlighted && (
                              <span title="Tillagd efter avräkning eller stängning">
                                <AlertCircle size={12} className="text-amber-500" />
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className="font-semibold text-expense text-money-sm">
                            -{expense.amount.toLocaleString('sv-SE')} kr
                          </p>
                          {canEdit && <span className="text-muted-foreground/40 group-hover:text-muted-foreground text-lg transition-all group-hover:translate-x-0.5">›</span>}
                        </div>
                      </div>
                    </div>
                  );
                } else if (item.type === 'income') {
                  const income = item.data as Income;
                  const canEdit = !!userId;
                  const isHighlighted = highlightedIds?.has(income.id);

                  return (
                    <div
                      key={`income-${income.id}`}
                      className={`group p-3.5 list-hover rounded-lg ${canEdit ? "cursor-pointer" : "cursor-default opacity-90"} ${isHighlighted ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={() => {
                        if (!canEdit) return;
                        onEditIncome(income);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-income-bg shrink-0">
                          <ArrowDownLeft size={16} className="text-income" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{income.note || 'Inkomst'}</p>
                          <p className="text-caption flex items-center gap-1">
                            {members.find(m => m.user_id === income.recipient)?.name} •{' '}
                            {new Date(income.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                            {isHighlighted && (
                              <span title="Tillagd efter avräkning eller stängning">
                                <AlertCircle size={12} className="text-amber-500" />
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className="font-semibold text-income text-money-sm">
                            +{toKronor(income.amount).toLocaleString('sv-SE')} kr
                          </p>
                          {canEdit && <span className="text-muted-foreground/40 group-hover:text-muted-foreground text-lg transition-all group-hover:translate-x-0.5">›</span>}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const settlement = item.data as Settlement;
                  const fromName = members.find(m => m.user_id === settlement.from_user)?.name || 'Okänd';
                  const toName = members.find(m => m.user_id === settlement.to_user)?.name || 'Okänd';

                  return (
                    <div
                      key={`settlement-${settlement.id}`}
                      className="p-3.5 list-hover rounded-lg cursor-default"
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-muted shrink-0">
                          <Smartphone size={16} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{fromName} &rarr; {toName}</p>
                          <p className="text-caption">
                            Avräkning •{' '}
                            {new Date(settlement.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-muted-foreground text-money-sm">
                            {settlement.amount.toLocaleString('sv-SE')} kr
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="rounded-full bg-muted p-5 mb-4">
              <Plus className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">Redo att börja?</p>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">Lägg till din första utgift eller inkomst för att börja dela kostnader</p>
            <Button
              onClick={onAddClick}
              className="gap-2"
            >
              <Plus size={20} />
              Lägg till transaktion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
