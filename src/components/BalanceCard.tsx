import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GroupMember } from "@/hooks/useGroups";
import { Expense } from "@/hooks/useExpenses";
import { Income } from "@/hooks/useIncomes";
import { Settlement } from "@/hooks/useSettlements";
import { calculateBalance, getBalanceBreakdown } from "@/lib/balanceUtils";
import { SettlementModal } from "@/components/SettlementModal";
import { Check, Users, Loader2, ChevronDown, ChevronUp, Smartphone } from "lucide-react";

interface BalanceCardProps {
  expenses: Expense[];
  incomes: Income[];
  members: GroupMember[];
  settlements: Settlement[];
  selectedYear: number;
  selectedMonth: number;
  onSettle: (fromUser: string, toUser: string, amount: number) => Promise<void>;
  isSettling?: boolean;
}

export function BalanceCard({
  expenses,
  incomes,
  members,
  settlements,
  selectedYear,
  selectedMonth,
  onSettle,
  isSettling = false,
}: BalanceCardProps) {
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // Create a memoized map for O(1) member lookups instead of O(n) finds
  const memberMap = useMemo(() => {
    return new Map(members.map((m) => [m.user_id, m]));
  }, [members]);

  // Filter settlements for the selected month
  const monthlySettlements = useMemo(() => {
    return settlements.filter((s) => {
      const date = new Date(s.date);
      return (
        date.getFullYear() === selectedYear &&
        date.getMonth() + 1 === selectedMonth
      );
    });
  }, [settlements, selectedYear, selectedMonth]);

  // Calculate balances from expenses, incomes, and settlements
  const adjustedBalances = useMemo(
    () => calculateBalance(expenses, members, monthlySettlements, incomes),
    [expenses, members, monthlySettlements, incomes]
  );

  // Get detailed breakdown for display
  const breakdown = useMemo(
    () => getBalanceBreakdown(expenses, members, monthlySettlements, incomes),
    [expenses, members, monthlySettlements, incomes]
  );

  // Find who owes whom based on final balance
  // Positive balance = should receive money, Negative balance = should pay
  const { positiveUser, negativeUser, oweAmount } = useMemo(() => {
    const posBalance = adjustedBalances.find((b) => b.balance > 0.5);
    const negBalance = adjustedBalances.find((b) => b.balance < -0.5);

    return {
      positiveUser: posBalance
        ? memberMap.get(posBalance.userId)
        : undefined,
      negativeUser: negBalance
        ? memberMap.get(negBalance.userId)
        : undefined,
      oweAmount: posBalance ? Math.abs(posBalance.balance) : 0,
    };
  }, [adjustedBalances, memberMap]);

  const handleConfirmSettle = async () => {
    if (!negativeUser || !positiveUser) return;
    await onSettle(negativeUser.user_id, positiveUser.user_id, Math.round(oweAmount));
    setIsSettleModalOpen(false);
  };

  // No balance section if only one member
  if (members.length < 2) {
    return (
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-label-mono">Balans</h2>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users size={18} />
              <p className="text-sm">Lägg till fler medlemmar för att se balansen.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All settled
  if (oweAmount < 1) {
    return (
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-label-mono">Balans</h2>
        <Card className="border-income/20 bg-income-bg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-income-bg">
                <Check size={18} className="text-income sm:hidden" />
                <Check size={20} className="text-income hidden sm:block" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm sm:text-base">Ni är jämna!</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Inga utestående skulder denna månad.
                </p>
              </div>
            </div>

            {monthlySettlements.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/60">
                <p className="text-label-mono mb-2">
                  Avräkningar denna månad
                </p>
                <div className="space-y-1.5">
                  {monthlySettlements.map((s) => {
                    const from = memberMap.get(s.from_user);
                    const to = memberMap.get(s.to_user);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs sm:text-sm gap-2"
                      >
                        <span className="text-muted-foreground truncate">
                          {from?.name} → {to?.name}
                        </span>
                        <span className="text-number-sm text-foreground shrink-0">
                          {s.amount.toLocaleString("sv-SE")} kr
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <h2 className="text-label-mono">Balans</h2>
      <Card>
        <CardContent className="p-4 sm:p-5">
          {/* Balance overview */}
          <div className="space-y-3 sm:space-y-4">
            {/* Who owes whom - stacked on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Att betala</p>
                <p className="text-sm sm:text-base font-medium text-foreground truncate">
                  {negativeUser?.name} → {positiveUser?.name}
                </p>
              </div>
              <p className="text-number-lg text-foreground">
                {Math.round(oweAmount).toLocaleString("sv-SE")} kr
              </p>
            </div>

            {/* Breakdown explanation - Collapsible */}
            <div className="pt-3 sm:pt-4 border-t border-border/60">
              <button
                onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground mb-2 sm:mb-3 hover:text-foreground transition-colors"
              >
                <span>Så här räknas det ut</span>
                {isBreakdownExpanded ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>

              {isBreakdownExpanded && (
                <div className="space-y-3 animate-fade-in">
                  {breakdown.length > 0 ? (
                    <>
                      {breakdown.map((b) => (
                        <div key={b.userId} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-icon-blue-bg flex items-center justify-center text-xs font-semibold text-icon-blue shrink-0">
                              {b.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">{b.name}</span>
                          </div>
                          <div className="ml-7 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                            <span className="text-muted-foreground">Inkomst:</span>
                      <span className="text-right text-number-sm text-income">
                        +{Math.round(b.incomeReceived).toLocaleString("sv-SE")} kr
                            </span>
                            <span className="text-muted-foreground">Utgifter:</span>
                      <span className="text-right text-number-sm text-expense">
                        −{Math.round(b.expensesPaid).toLocaleString("sv-SE")} kr
                            </span>
                            <span className="text-muted-foreground">Netto:</span>
                      <span className={`text-right text-number-sm font-medium ${b.netResult >= 0 ? 'text-income' : 'text-expense'}`}>
                        {b.netResult >= 0 ? '+' : ''}{Math.round(b.netResult).toLocaleString("sv-SE")} kr
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Target explanation */}
                      <div className="pt-2 border-t border-border/40">
                        <p className="text-xs text-muted-foreground">
                          Mål: Båda ska ha samma nettoresultat ({Math.round(breakdown[0]?.targetNet || 0).toLocaleString("sv-SE")} kr)
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Ingen data att visa för denna månad
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Individual balances - simplified */}
            <div className="pt-3 sm:pt-4 border-t border-border/60">
              <p className="text-label-mono mb-2 sm:mb-3">Kvar att betala</p>
              <div className="space-y-2">
                {adjustedBalances.map((balance) => {
                  const member = memberMap.get(balance.userId);
                  const isPositive = balance.balance > 0;
                  const isNegative = balance.balance < 0;

                  return (
                    <div
                      key={balance.userId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-icon-blue-bg flex items-center justify-center text-xs font-semibold text-icon-blue shrink-0">
                          {(member?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-foreground truncate">
                          {member?.name || "Okänd"}
                        </span>
                      </div>
                      <span
                        className={`text-number-sm shrink-0 ${
                          isPositive
                            ? "text-income"
                            : isNegative
                            ? "text-expense"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isPositive ? "Får " : isNegative ? "Ska betala " : ""}
                        {Math.abs(Math.round(balance.balance)).toLocaleString("sv-SE")} kr
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settlement history for this month */}
            {monthlySettlements.length > 0 && (
              <div className="pt-3 sm:pt-4 border-t border-border/60">
                <p className="text-label-mono mb-2">
                  Avräkningar denna månad
                </p>
                <div className="space-y-1.5">
                  {monthlySettlements.map((s) => {
                    const from = memberMap.get(s.from_user);
                    const to = memberMap.get(s.to_user);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs sm:text-sm gap-2"
                      >
                        <span className="text-muted-foreground truncate">
                          {from?.name} → {to?.name}
                        </span>
                        <span className="text-number-sm text-foreground shrink-0">
                          {s.amount.toLocaleString("sv-SE")} kr
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick settle button */}
            <Button
              className="w-full mt-1 sm:mt-2"
              onClick={() => setIsSettleModalOpen(true)}
              disabled={isSettling}
            >
              {isSettling ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <Smartphone size={16} className="mr-2" />
                  Swisha {Math.round(oweAmount).toLocaleString("sv-SE")} kr
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settlement modal */}
      {negativeUser && positiveUser && (
        <SettlementModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          onConfirm={handleConfirmSettle}
          fromUser={negativeUser}
          toUser={positiveUser}
          amount={oweAmount}
        />
      )}
    </div>
  );
}
