import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface PotentialDuplicate {
  id: string;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  type?: string;
  note?: string;
  similarity_score: number;
  match_reasons: string[];
}

interface DuplicateWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAnyway: () => void;
  onEdit: () => void;
  duplicates: PotentialDuplicate[];
  entryType: "expense" | "income";
}

export function DuplicateWarningDialog({
  isOpen,
  onClose,
  onSaveAnyway,
  onEdit,
  duplicates,
  entryType,
}: DuplicateWarningDialogProps) {
  const formatAmount = (amount: number, type: "expense" | "income") => {
    // Income amounts are in cents
    const amountKr = type === "income" ? amount / 100 : amount;
    return amountKr.toLocaleString("sv-SE", { minimumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-background border border-border rounded-lg w-full max-w-md shadow-xl">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Möjlig dubblett hittad
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Denna {entryType === "expense" ? "utgift" : "inkomst"} liknar en befintlig post
                  </p>
                </div>
              </div>

              {/* Duplicates list */}
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {duplicates.map((dup, index) => (
                  <div
                    key={dup.id}
                    className="p-3 rounded-md border border-border bg-secondary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entryType === "expense"
                            ? dup.description || dup.category || "Utgift"
                            : dup.type || dup.note || "Inkomst"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(dup.date)}
                        </p>
                      </div>
                      <p className="text-number-sm shrink-0">
                        {formatAmount(dup.amount, entryType)} kr
                      </p>
                    </div>
                    
                    {/* Match reasons */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {dup.match_reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                  >
                    Avbryt
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onEdit}
                  >
                    Redigera
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={onSaveAnyway}
                >
                  Spara ändå
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
