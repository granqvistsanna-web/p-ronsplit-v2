import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupMember } from "@/hooks/useGroups";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { ExpenseSplit } from "@/hooks/useExpenses";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DuplicateWarningDialog, PotentialDuplicate } from "./DuplicateWarningDialog";
import { Loader2 } from "lucide-react";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
    splits?: ExpenseSplit | null;
  }) => void;
  groupId: string;
  members: GroupMember[];
}

export function AddExpenseModal({ isOpen, onClose, onAdd, groupId, members }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [useCustomSplit, setUseCustomSplit] = useState(false);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Initialize custom splits when toggled on, when members change, or when amount changes
  useEffect(() => {
    if (useCustomSplit && amount && members.length > 0) {
      const totalAmount = parseFloat(amount) || 0;
      const perPerson = totalAmount / members.length;
      const splits: Record<string, string> = {};
      members.forEach((member) => {
        splits[member.user_id] = perPerson.toFixed(2);
      });
      setCustomSplits(splits);
    }
  }, [useCustomSplit, members, amount]);

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

  const validateForm = (): boolean => {
    if (!amount || !category || !description) {
      if (!amount) {
        toast.error("Ange ett belopp");
        return false;
      }
      if (!description) {
        toast.error("Ange en beskrivning");
        return false;
      }
      if (!category) {
        toast.error("Välj en kategori");
        return false;
      }
      return false;
    }

    const totalAmount = parseFloat(amount);

    if (Number.isNaN(totalAmount) || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Ange ett giltigt belopp större än 0");
      return false;
    }

    if (useCustomSplit) {
      const splitSum = calculateSplitSum();

      const hasInvalidSplit = Object.values(customSplits).some(val => {
        const num = parseFloat(val);
        return Number.isNaN(num) || !Number.isFinite(num) || num < 0;
      });

      if (hasInvalidSplit) {
        toast.error("Alla fördelningsvärden måste vara giltiga positiva tal");
        return false;
      }

      if (Math.abs(splitSum - totalAmount) > 0.01) {
        toast.error(`Summan av fördelningen (${splitSum.toFixed(2)} kr) måste vara lika med totala beloppet (${totalAmount.toFixed(2)} kr)`);
        return false;
      }
    }

    return true;
  };

  const checkForDuplicates = async (): Promise<PotentialDuplicate[]> => {
    try {
      const { data, error } = await supabase.functions.invoke("check-duplicates", {
        body: {
          type: "expense",
          group_id: groupId,
          amount: parseFloat(amount),
          date,
          category,
          description,
        },
      });

      if (error) {
        console.error("Error checking duplicates:", error);
        return [];
      }

      return data?.duplicates || [];
    } catch (err) {
      console.error("Failed to check duplicates:", err);
      return [];
    }
  };

  const saveExpense = () => {
    const totalAmount = parseFloat(amount);
    
    let splits: ExpenseSplit | null = null;
    if (useCustomSplit) {
      splits = {};
      Object.entries(customSplits).forEach(([userId, value]) => {
        splits![userId] = parseFloat(value) || 0;
      });
    }

    onAdd({
      group_id: groupId,
      amount: totalAmount,
      paid_by: user?.id || "",
      category,
      description,
      date,
      splits,
    });

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setUseCustomSplit(false);
    setCustomSplits({});
    setPotentialDuplicates([]);
    setShowDuplicateWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsCheckingDuplicates(true);
    
    try {
      const duplicates = await checkForDuplicates();
      
      if (duplicates.length > 0) {
        setPotentialDuplicates(duplicates);
        setShowDuplicateWarning(true);
      } else {
        saveExpense();
      }
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleSaveAnyway = () => {
    setShowDuplicateWarning(false);
    saveExpense();
  };

  const handleEditAfterWarning = () => {
    setShowDuplicateWarning(false);
    // Keep form open with current values so user can edit
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-md w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-foreground">Ny utgift</h2>
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center -mr-1">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm text-muted-foreground">
                      Belopp (kr)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      autoFocus
                    />
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
                    <Label htmlFor="description" className="text-sm text-muted-foreground">
                      Beskrivning
                    </Label>
                    <Input
                      id="description"
                      placeholder="t.ex. ICA Maxi"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm text-muted-foreground">
                      Datum
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

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
                      <div className="space-y-3 p-3 sm:p-3 border border-border rounded-md bg-secondary/20">
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
                              placeholder="0.00"
                              value={customSplits[member.user_id] || ""}
                              onChange={(e) => handleSplitChange(member.user_id, e.target.value)}
                              className="w-28 sm:w-24 h-10 sm:h-9"
                            />
                            <span className="text-sm text-muted-foreground shrink-0">kr</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Summa:</span>
                            <span className={`font-medium ${
                              Math.abs(calculateSplitSum() - (parseFloat(amount) || 0)) < 0.01
                                ? "text-green-600"
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

                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                      disabled={isCheckingDuplicates}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isCheckingDuplicates}>
                      {isCheckingDuplicates ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Kontrollerar...
                        </>
                      ) : (
                        "Lägg till"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DuplicateWarningDialog
        isOpen={showDuplicateWarning}
        onClose={() => setShowDuplicateWarning(false)}
        onSaveAnyway={handleSaveAnyway}
        onEdit={handleEditAfterWarning}
        duplicates={potentialDuplicates}
        entryType="expense"
      />
    </>
  );
}
