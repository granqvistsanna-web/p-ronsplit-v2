/**
 * Review step component - displays transaction list with summary and actions
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "./TransactionRow";
import type { ExtendedTransaction } from "./types";

interface ReviewStepProps {
  transactions: ExtendedTransaction[];
  onCategoryChange: (id: string, category: string) => void;
  onToggleShared: (id: string) => void;
  onToggleType: (id: string) => void;
  onImport: () => void;
  onCancel: () => void;
}

export function ReviewStep({
  transactions,
  onCategoryChange,
  onToggleShared,
  onToggleType,
  onImport,
  onCancel,
}: ReviewStepProps) {
  // Calculate shared transactions for import preview
  const sharedExpenses = transactions.filter(
    (t) => t.isShared && t.transactionType === "expense"
  );
  const sharedIncomes = transactions.filter(
    (t) => t.isShared && t.transactionType === "income"
  );
  const totalToImport = sharedExpenses.length + sharedIncomes.length;

  const totalExpenseAmount = sharedExpenses.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  const totalIncomeAmount = sharedIncomes.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar - compact and informative */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/40 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="font-medium text-foreground">{totalToImport}</span>
              <span className="text-muted-foreground">
                {" "}
                av {transactions.length} delade
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {sharedExpenses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-expense" />
                <span className="text-number-sm text-expense font-medium">
                  -{totalExpenseAmount.toLocaleString("sv-SE")} kr
                </span>
              </div>
            )}
            {sharedIncomes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-income" />
                <span className="text-number-sm text-income font-medium">
                  +{totalIncomeAmount.toLocaleString("sv-SE")} kr
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction list - generous spacing */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
        {transactions.map((t, index) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
          >
            <TransactionRow
              transaction={t}
              onCategoryChange={(cat) => onCategoryChange(t.id, cat)}
              onToggleShared={() => onToggleShared(t.id)}
              onToggleType={() => onToggleType(t.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Actions - sticky footer */}
      <div className="shrink-0 px-6 py-5 border-t border-border bg-card">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={onCancel}>
            Avbryt
          </Button>
          <Button
            className="flex-1 h-12 font-medium"
            onClick={onImport}
            disabled={totalToImport === 0}
          >
            Importera {totalToImport} transaktioner
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Tryck på pilen för att byta typ, "Delad" för att exkludera
        </p>
      </div>
    </div>
  );
}
