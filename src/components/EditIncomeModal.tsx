import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Income, IncomeType, IncomeRepeat } from "@/hooks/useIncomes";
import { GroupMember } from "@/hooks/useGroups";
import { getIncomeTypeIcon, getIncomeTypeLabel } from "@/lib/incomeUtils";
import { RecurringSection, RepeatInterval } from "@/components/RecurringSection";
import { toast } from "sonner";

interface EditIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (income: Income) => void;
  onDelete?: (incomeId: string) => void;
  income: Income | null;
  members: GroupMember[];
}

const INCOME_TYPES: IncomeType[] = ["salary", "bonus", "benefit", "fkassa", "bidrag", "other"];

export function EditIncomeModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  income,
  members,
}: EditIncomeModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("salary");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [repeat, setRepeat] = useState<RepeatInterval>("none");
  const [includedInSplit, setIncludedInSplit] = useState(true);
  const [recipient, setRecipient] = useState("");

  useEffect(() => {
    if (income) {
      // Convert cents to kr
      setAmount((income.amount / 100).toFixed(2));
      setType(income.type);
      setNote(income.note || "");
      setDate(income.date);
      setRepeat(income.repeat || "none");
      setIncludedInSplit(income.included_in_split);
      setRecipient(income.recipient);
    }
  }, [income]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!income || !amount) return;

    const amountKr = parseFloat(amount);

    // Validate amount is a valid positive number
    if (
      Number.isNaN(amountKr) ||
      !Number.isFinite(amountKr) ||
      amountKr <= 0
    ) {
      toast.error("Ange ett giltigt belopp större än 0");
      return;
    }

    // Convert to cents
    const amountCents = Math.round(amountKr * 100);

    onSave({
      ...income,
      amount: amountCents,
      type,
      note: note.trim() || null,
      date,
      repeat: repeat as IncomeRepeat,
      included_in_split: includedInSplit,
      recipient,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && income && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          >
            <div className="bg-card border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-x-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0">
                <h2 className="text-lg font-medium text-foreground">
                  Redigera inkomst
                </h2>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
                <form id="edit-income-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-income-amount"
                      className="text-sm text-muted-foreground"
                    >
                      Belopp (kr)
                    </Label>
                    <Input
                      id="edit-income-amount"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mottagare</Label>
                    <select
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="flex h-12 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                      style={{ fontSize: '16px' }}
                    >
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Typ</Label>
                    <div className="flex flex-wrap gap-2">
                      {INCOME_TYPES.map((incomeType) => (
                        <button
                          key={incomeType}
                          type="button"
                          onClick={() => setType(incomeType)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 sm:py-1.5 text-sm transition-colors active:scale-95 ${
                            type === incomeType
                              ? "border-foreground bg-secondary"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <span>{getIncomeTypeIcon(incomeType)}</span>
                          <span className="text-foreground">
                            {getIncomeTypeLabel(incomeType)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-date"
                      className="text-sm text-muted-foreground"
                    >
                      Datum
                    </Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-note"
                      className="text-sm text-muted-foreground"
                    >
                      Anteckning (valfritt)
                    </Label>
                    <Input
                      id="edit-note"
                      placeholder="t.ex. Månadslön december"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>

                  {/* Recurring section */}
                  <RecurringSection
                    value={repeat}
                    onChange={setRepeat}
                  />

                  <div className="flex items-center space-x-2 p-3 border border-border rounded-md">
                    <Checkbox
                      id="edit-includedInSplit"
                      checked={includedInSplit}
                      onCheckedChange={(checked) =>
                        setIncludedInSplit(checked === true)
                      }
                    />
                    <Label
                      htmlFor="edit-includedInSplit"
                      className="text-sm font-normal text-foreground cursor-pointer"
                    >
                      Inkludera i 50/50-delning
                    </Label>
                  </div>
                </form>
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-border bg-card safe-area-pb">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-12 sm:h-10"
                  >
                    Avbryt
                  </Button>
                  {onDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12 sm:h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (income) {
                          onDelete(income.id);
                          onClose();
                        }
                      }}
                    >
                      Ta bort
                    </Button>
                  )}
                  <Button
                    type="submit"
                    form="edit-income-form"
                    className="flex-1 h-12 sm:h-10"
                  >
                    Spara
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
