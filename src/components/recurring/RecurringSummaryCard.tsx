import { Card, CardContent } from "@/components/ui/card";

interface RecurringSummaryCardProps {
  totalExpenses: number;
  totalIncomes: number;
}

export function RecurringSummaryCard({ totalExpenses, totalIncomes }: RecurringSummaryCardProps) {
  const netto = totalIncomes - totalExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Expenses */}
      <Card className="animate-fade-in hover-lift" style={{ animationDelay: '40ms' }}>
        <CardContent className="p-6">
          <p className="text-label-mono mb-2">Utgifter</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {totalExpenses.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">/månad</p>
        </CardContent>
      </Card>

      {/* Income */}
      <Card className="animate-fade-in hover-lift" style={{ animationDelay: '60ms' }}>
        <CardContent className="p-6">
          <p className="text-label-mono mb-2">Inkomster</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-income">
            {totalIncomes.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">/månad</p>
        </CardContent>
      </Card>

      {/* Netto */}
      <Card className="animate-fade-in hover-lift" style={{ animationDelay: '80ms' }}>
        <CardContent className="p-6">
          <p className="text-label-mono mb-2">Netto</p>
          <p className={`text-2xl font-semibold tracking-tight tabular-nums ${netto >= 0 ? 'text-income' : 'text-icon-pink'}`}>
            {netto >= 0 ? '+' : ''}{netto.toLocaleString("sv-SE")} <span className="text-base font-medium">kr</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">/månad</p>
        </CardContent>
      </Card>
    </div>
  );
}
