import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Income } from "@/hooks/useIncomes";
import { GroupMember } from "@/hooks/useGroups";
import { calculateIncomeSettlement, formatAmount } from "@/lib/incomeUtils";

interface IncomeOverviewCardProps {
  incomes: Income[];
  members: GroupMember[];
  selectedYear: number;
  selectedMonth: number; // 1-12
}

export function IncomeOverviewCard({
  incomes,
  members,
  selectedYear,
  selectedMonth,
}: IncomeOverviewCardProps) {
  const settlement = useMemo(() => {
    if (members.length < 2) {
      return null;
    }

    const personAId = members[0].user_id;
    const personBId = members[1].user_id;

    return calculateIncomeSettlement(
      incomes,
      personAId,
      personBId,
      selectedYear,
      selectedMonth
    );
  }, [incomes, members, selectedYear, selectedMonth]);

  if (!settlement || members.length < 2) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Inkomstöversikt kräver minst två gruppmedlemmar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const personA = members[0];
  const personB = members[1];
  const transferFrom = settlement.transferFrom
    ? members.find((m) => m.user_id === settlement.transferFrom)
    : null;
  const transferTo = settlement.transferTo
    ? members.find((m) => m.user_id === settlement.transferTo)
    : null;

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground capitalize">
        Inkomstöversikt · {monthName}
      </h3>

      {/* Total Income Card */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Total inkomst
          </p>
          <p className="text-number-display text-foreground">
            {formatAmount(settlement.totalIncome)}
          </p>
        </CardContent>
      </Card>

      {/* Per-person income breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              {personA.name}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intjänat:</span>
                <span className="text-number-sm">
                  {formatAmount(settlement.personAIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Andel (50%):</span>
                <span className="text-number-sm">
                  {formatAmount(settlement.shareA)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Balans:</span>
                <span
                  className={`text-number-sm ${
                    settlement.balanceA > 0
                      ? "text-warning"
                      : settlement.balanceA < 0
                      ? "text-income"
                      : "text-muted-foreground"
                  }`}
                >
                  {settlement.balanceA > 0 && "+"}
                  {formatAmount(settlement.balanceA)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              {personB.name}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intjänat:</span>
                <span className="text-number-sm">
                  {formatAmount(settlement.personBIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Andel (50%):</span>
                <span className="text-number-sm">
                  {formatAmount(settlement.shareB)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Balans:</span>
                <span
                  className={`text-number-sm ${
                    settlement.balanceB > 0
                      ? "text-warning"
                      : settlement.balanceB < 0
                      ? "text-income"
                      : "text-muted-foreground"
                  }`}
                >
                  {settlement.balanceB > 0 && "+"}
                  {formatAmount(settlement.balanceB)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Transfer Card */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Inkomstbalans
          </p>
          {settlement.transferAmount > 0 && transferFrom && transferTo ? (
            <div>
              <p className="text-base text-muted-foreground mb-1">
                <span className="font-medium text-foreground">
                  {transferFrom.name}
                </span>
                <span className="mx-2">→</span>
                <span className="font-medium text-foreground">
                  {transferTo.name}
                </span>
              </p>
              <p className="text-number-display text-foreground">
                {formatAmount(settlement.transferAmount)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              Kvitt ✓
            </p>
          )}
        </CardContent>
      </Card>

      {/* Excluded incomes note */}
      {settlement.excludedTotal > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
          Exkluderat från delning: {formatAmount(settlement.excludedTotal)}
        </div>
      )}
    </div>
  );
}
