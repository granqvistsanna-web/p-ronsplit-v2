/**
 * Individual transaction row component for the review step
 */

import { ArrowUpRight, ArrowDownLeft, AlertTriangle } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import type { ExtendedTransaction } from "./types";

interface TransactionRowProps {
  transaction: ExtendedTransaction;
  onCategoryChange: (category: string) => void;
  onToggleShared: () => void;
  onToggleType: () => void;
}

export function TransactionRow({
  transaction,
  onCategoryChange,
  onToggleShared,
  onToggleType,
}: TransactionRowProps) {
  const isExpense = transaction.transactionType === "expense";
  const isActive = transaction.isShared;

  // Safe date parsing with fallback
  let formattedDate = "Ogiltigt datum";
  try {
    const date = new Date(transaction.date);
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
      });
    }
  } catch (error) {
    console.warn(
      "Invalid date in transaction:",
      transaction.id,
      transaction.date
    );
  }

  // Safe amount validation
  const safeAmount =
    Number.isFinite(transaction.amount) && transaction.amount >= 0
      ? transaction.amount
      : 0;

  return (
    <div
      className={`
      rounded-xl border p-4 transition-all duration-150
      ${
        isActive
          ? "border-border bg-card hover:border-primary/30"
          : "border-transparent bg-muted/40 opacity-50"
      }
    `}
    >
      <div className="flex items-center gap-4">
        {/* Type toggle - larger touch target */}
        <button
          onClick={onToggleType}
          className={`
            p-2.5 rounded-xl shrink-0 transition-all duration-150 active:scale-95
            ${
              isExpense
                ? "bg-expense/10 hover:bg-expense/15"
                : "bg-income/10 hover:bg-income/15"
            }
          `}
          title={isExpense ? "Utgift" : "Inkomst"}
        >
          {isExpense ? (
            <ArrowUpRight size={18} className="text-expense" />
          ) : (
            <ArrowDownLeft size={18} className="text-income" />
          )}
        </button>

        {/* Description and date */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate leading-tight">
            {transaction.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {/* Amount */}
        <p
          className={`text-number font-semibold shrink-0 ${
            isExpense ? "text-expense" : "text-income"
          }`}
        >
          {isExpense ? "-" : "+"}
          {safeAmount.toLocaleString("sv-SE")} kr
        </p>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        {isExpense && (
          <select
            value={transaction.category || "ovrigt"}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background flex-1 max-w-[180px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onToggleShared}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]
            ${
              transaction.isShared
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }
          `}
        >
          {transaction.isShared ? "Delad" : "Privat"}
        </button>
      </div>
    </div>
  );
}
