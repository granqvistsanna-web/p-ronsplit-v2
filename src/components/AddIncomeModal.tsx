import { type FormEvent, type MouseEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IncomeType, IncomeRepeat, IncomeInput, Income } from "@/hooks/useIncomes";
import { getIncomeTypeIcon, getIncomeTypeLabel } from "@/lib/incomeUtils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DuplicateWarningDialog, PotentialDuplicate } from "./DuplicateWarningDialog";
import { Loader2 } from "lucide-react";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (income: IncomeInput) => Promise<Income | null>;
  groupId: string;
}

const INCOME_TYPES: IncomeType[] = ["salary", "bonus", "benefit", "fkassa", "bidrag", "other"];

export function AddIncomeModal({
  isOpen,
  onClose,
  onAdd,
  groupId,
}: AddIncomeModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("salary");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [repeat, setRepeat] = useState<IncomeRepeat>("none");
  const [includedInSplit, setIncludedInSplit] = useState(true);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [pendingSaveAndAddAnother, setPendingSaveAndAddAnother] = useState(false);

  const resetForm = () => {
    setAmount("");
    setType("salary");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    setRepeat("none");
    setIncludedInSplit(true);
    setPotentialDuplicates([]);
    setShowDuplicateWarning(false);
    setPendingSaveAndAddAnother(false);
  };

  const validateForm = (): boolean => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return false;
    }

    if (!amount) {
      toast.error("Ange ett belopp");
      return false;
    }

    const amountKr = parseFloat(amount);

    if (Number.isNaN(amountKr) || !Number.isFinite(amountKr) || amountKr <= 0) {
      toast.error("Ange ett giltigt belopp större än 0");
      return false;
    }

    return true;
  };

  const checkForDuplicates = async (): Promise<PotentialDuplicate[]> => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    
    try {
      const { data, error } = await supabase.functions.invoke("check-duplicates", {
        body: {
          type: "income",
          group_id: groupId,
          amount: amountCents,
          date,
          income_type: type,
          note: note.trim() || undefined,
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

  const saveIncome = async (saveAndAddAnother: boolean) => {
    if (!user) return;

    const amountCents = Math.round(parseFloat(amount) * 100);

    const result = await onAdd({
      group_id: groupId,
      amount: amountCents,
      recipient: user.id,
      type,
      note: note.trim() || undefined,
      date,
      repeat,
      included_in_split: includedInSplit,
    });

    if (result) {
      if (saveAndAddAnother) {
        resetForm();
        setTimeout(() => {
          document.getElementById("income-amount")?.focus();
        }, 0);
      } else {
        resetForm();
        onClose();
      }
    }
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>,
    saveAndAddAnother: boolean = false
  ) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsCheckingDuplicates(true);
    setPendingSaveAndAddAnother(saveAndAddAnother);
    
    try {
      const duplicates = await checkForDuplicates();
      
      if (duplicates.length > 0) {
        setPotentialDuplicates(duplicates);
        setShowDuplicateWarning(true);
      } else {
        await saveIncome(saveAndAddAnother);
      }
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleSaveAnyway = async () => {
    setShowDuplicateWarning(false);
    await saveIncome(pendingSaveAndAddAnother);
  };

  const handleEditAfterWarning = () => {
    setShowDuplicateWarning(false);
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
                  <h2 className="text-lg font-medium text-foreground">
                    Ny inkomst
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center -mr-1"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="income-amount" className="text-sm text-muted-foreground">
                      Belopp (kr)
                    </Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      autoFocus
                    />
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
                    <Label htmlFor="repeat" className="text-sm text-muted-foreground">
                      Upprepa
                    </Label>
                    <select
                      id="repeat"
                      value={repeat}
                      onChange={(e) => setRepeat(e.target.value as IncomeRepeat)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="none">Ingen</option>
                      <option value="monthly">Månadsvis</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-sm text-muted-foreground">
                      Anteckning (valfritt)
                    </Label>
                    <Input
                      id="note"
                      placeholder="t.ex. Månadslön december"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2 p-3 border border-border rounded-md">
                    <Checkbox
                      id="includedInSplit"
                      checked={includedInSplit}
                      onCheckedChange={(checked) =>
                        setIncludedInSplit(checked === true)
                      }
                    />
                    <Label
                      htmlFor="includedInSplit"
                      className="text-sm font-normal text-foreground cursor-pointer"
                    >
                      Inkludera i 50/50-delning
                    </Label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
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
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Spara"
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleSubmit(e, true)}
                      className="w-full"
                      disabled={isCheckingDuplicates}
                    >
                      {isCheckingDuplicates ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Spara och lägg till ny"
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
        entryType="income"
      />
    </>
  );
}
