import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupMember } from "@/hooks/useGroups";
import { Expense, ExpenseSplit, ExpenseRepeat } from "@/hooks/useExpenses";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { RecurringSection, RepeatInterval } from "@/components/RecurringSection";
import { toast } from "sonner";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
  expense: Expense | null;
  members: GroupMember[];
}

export function EditExpenseModal({ isOpen, onClose, onSave, onDelete, expense, members }: EditExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [repeat, setRepeat] = useState<RepeatInterval>("none");
  const [useCustomSplit, setUseCustomSplit] = useState(false);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDescription(expense.description || "");
      setDate(expense.date);
      setPaidBy(expense.paid_by);
      setRepeat(expense.repeat || "none");

      // Load splits if they exist
      if (expense.splits) {
        setUseCustomSplit(true);
        const splits: Record<string, string> = {};
        Object.entries(expense.splits).forEach(([userId, value]) => {
          splits[userId] = value.toString();
        });
        setCustomSplits(splits);
      } else {
        setUseCustomSplit(false);
        setCustomSplits({});
      }
    }
  }, [expense]);

  // Initialize custom splits when toggled on or when amount/members change
  useEffect(() => {
    if (useCustomSplit && amount && members.length > 0) {
      const totalAmount = parseFloat(amount) || 0;
      const currentSum = calculateSplitSum();

      // If splits are empty or don't exist for all members, initialize with equal split
      const hasAllMembers = members.every(m => m.user_id in customSplits);
      if (Object.keys(customSplits).length === 0 || !hasAllMembers) {
        const perPerson = totalAmount / members.length;
        const splits: Record<string, string> = {};
        members.forEach((member) => {
          splits[member.user_id] = perPerson.toFixed(2);
        });
        setCustomSplits(splits);
      } else if (currentSum > 0 && Math.abs(currentSum - totalAmount) > 0.01) {
        // If amount changed and splits exist, scale them proportionally
        const scaleFactor = totalAmount / currentSum;
        const splits: Record<string, string> = {};
        members.forEach((member) => {
          const currentValue = parseFloat(customSplits[member.user_id] || "0");
          splits[member.user_id] = (currentValue * scaleFactor).toFixed(2);
        });
        setCustomSplits(splits);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomSplit, amount, members]);

  const handleSplitChange = (userId: string, value: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const calculateSplitSum = () => {
    return Object.values(customSplits).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense || !amount || !category || !description) return;

    const totalAmount = parseFloat(amount);

    // Validate amount is a valid positive number
    if (Number.isNaN(totalAmount) || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Ange ett giltigt belopp större än 0");
      return;
    }

    // Validate custom splits if enabled
    if (useCustomSplit) {
      const splitSum = calculateSplitSum();

      // Validate all split values are valid numbers
      const hasInvalidSplit = Object.values(customSplits).some(val => {
        const num = parseFloat(val);
        return Number.isNaN(num) || !Number.isFinite(num) || num < 0;
      });

      if (hasInvalidSplit) {
        toast.error("Alla fördelningsvärden måste vara giltiga positiva tal");
        return;
      }

      if (Math.abs(splitSum - totalAmount) > 0.01) {
        toast.error(`Summan av fördelningen (${splitSum.toFixed(2)} kr) måste vara lika med totala beloppet (${totalAmount.toFixed(2)} kr)`);
        return;
      }
    }

    // Build splits object
    let splits: ExpenseSplit | null = null;
    if (useCustomSplit) {
      splits = {};
      Object.entries(customSplits).forEach(([userId, value]) => {
        splits![userId] = parseFloat(value) || 0;
      });
    }

    onSave({
      ...expense,
      amount: totalAmount,
      category,
      description,
      date,
      paid_by: paidBy,
      splits,
      repeat: repeat as ExpenseRepeat,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && expense && (
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
                <h2 className="text-lg font-medium text-foreground">Redigera utgift</h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
                <form id="edit-expense-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="text-sm text-muted-foreground">
                      Belopp (kr)
                    </Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Betalades av</Label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
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
                    <Label className="text-sm text-muted-foreground">Kategori</Label>
                    <div className="flex flex-wrap gap-2">
                      {(showAllCategories ? DEFAULT_CATEGORIES : DEFAULT_CATEGORIES.slice(0, 5)).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 sm:py-1.5 text-sm transition-colors active:scale-95 ${
                            category === cat.id
                              ? "border-foreground bg-secondary"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="text-foreground">{cat.name}</span>
                        </button>
                      ))}
                      {!showAllCategories && DEFAULT_CATEGORIES.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllCategories(true)}
                          className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 sm:py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                        >
                          <span>+{DEFAULT_CATEGORIES.length - 5}</span>
                          <span>Visa fler</span>
                        </button>
                      )}
                      {showAllCategories && (
                        <button
                          type="button"
                          onClick={() => setShowAllCategories(false)}
                          className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 sm:py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                        >
                          <span>Visa färre</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description" className="text-sm text-muted-foreground">
                      Beskrivning
                    </Label>
                    <Input
                      id="edit-description"
                      placeholder="t.ex. ICA Maxi veckoinköp"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="h-12 sm:h-10 text-base sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-date" className="text-sm text-muted-foreground">
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

                  {/* Recurring section */}
                  <RecurringSection
                    value={repeat}
                    onChange={setRepeat}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Fördelning</Label>
                      <button
                        type="button"
                        onClick={() => setUseCustomSplit(!useCustomSplit)}
                        className="text-sm text-primary hover:underline"
                      >
                        {useCustomSplit ? "Jämn delning" : "Anpassad delning"}
                      </button>
                    </div>

                    {useCustomSplit && amount && (
                      <div className="space-y-2 p-3 border border-border rounded-md bg-secondary/20">
                        <p className="text-xs text-muted-foreground mb-2">
                          Fördela {parseFloat(amount).toFixed(2)} kr mellan gruppmedlemmar:
                        </p>
                        {members.map((member) => (
                          <div key={member.user_id} className="flex items-center gap-2">
                            <Label className="text-sm flex-1 text-foreground">
                              {member.name}
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={customSplits[member.user_id] || ""}
                              onChange={(e) => handleSplitChange(member.user_id, e.target.value)}
                              className="w-28 sm:w-24 h-10 sm:h-9"
                            />
                            <span className="text-sm text-muted-foreground">kr</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Summa:</span>
                            <span className={`font-medium ${
                              Math.abs(calculateSplitSum() - (parseFloat(amount) || 0)) < 0.01
                                ? "text-income"
                                : "text-destructive"
                            }`}>
                              {calculateSplitSum().toFixed(2)} kr
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!useCustomSplit && (
                      <p className="text-xs text-muted-foreground">
                        Delas lika mellan alla gruppmedlemmar
                      </p>
                    )}
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
                        if (expense) {
                          onDelete(expense.id);
                          onClose();
                        }
                      }}
                    >
                      Ta bort
                    </Button>
                  )}
                  <Button
                    type="submit"
                    form="edit-expense-form"
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
