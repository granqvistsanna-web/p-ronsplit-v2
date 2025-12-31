import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GroupMember } from "@/hooks/useGroups";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { ExpenseSplit, ExpenseRepeat } from "@/hooks/useExpenses";
import { IncomeType, IncomeRepeat, IncomeInput, Income } from "@/hooks/useIncomes";
import { getIncomeTypeIcon, getIncomeTypeLabel } from "@/lib/incomeUtils";
import { RecurringSection, RepeatInterval } from "@/components/RecurringSection";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
    splits?: ExpenseSplit | null;
    repeat?: ExpenseRepeat;
  }) => void;
  onAddIncome: (income: IncomeInput) => Promise<Income | null>;
  groupId: string;
  members: GroupMember[];
  defaultType?: "expense" | "income";
}

const INCOME_TYPES: IncomeType[] = ["salary", "bonus", "benefit", "fkassa", "bidrag", "other"];

export function AddTransactionModal({
  isOpen,
  onClose,
  onAddExpense,
  onAddIncome,
  groupId,
  members,
  defaultType = "expense",
}: AddTransactionModalProps) {
  const { user } = useAuth();

  // Transaction type
  const [transactionType, setTransactionType] = useState<"expense" | "income">(defaultType);

  // Common fields
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [repeat, setRepeat] = useState<RepeatInterval>("none");

  // Expense-specific fields
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id);
  const [description, setDescription] = useState("");
  const [distributionMode, setDistributionMode] = useState<"equal" | "self" | "select" | "custom">("equal");
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // Income-specific fields
  const [incomeType, setIncomeType] = useState<IncomeType>("salary");
  const [note, setNote] = useState("");
  const [includedInSplit, setIncludedInSplit] = useState(true);

  // Initialize splits based on distribution mode
  useEffect(() => {
    if (!amount || members.length === 0 || transactionType !== "expense") return;

    const totalAmount = parseFloat(amount) || 0;
    const splits: Record<string, string> = {};

    if (distributionMode === "custom") {
      // Equal split as starting point for custom mode
      const perPerson = totalAmount / members.length;
      members.forEach((member) => {
        splits[member.user_id] = perPerson.toFixed(2);
      });
      setCustomSplits(splits);
    } else if (distributionMode === "self") {
      // Only the current user (payer) gets 100%
      members.forEach((member) => {
        splits[member.user_id] = member.user_id === user?.id ? totalAmount.toFixed(2) : "0.00";
      });
      setCustomSplits(splits);
    } else if (distributionMode === "select") {
      // Split among selected participants
      const selected = selectedParticipants.size > 0
        ? Array.from(selectedParticipants)
        : members.map(m => m.user_id);
      const perPerson = totalAmount / selected.length;
      members.forEach((member) => {
        splits[member.user_id] = selected.includes(member.user_id) ? perPerson.toFixed(2) : "0.00";
      });
      setCustomSplits(splits);
    }
  }, [distributionMode, members, amount, transactionType, user?.id, selectedParticipants]);


  const handleSplitChange = (userId: string, value: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleToggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      // Ensure at least one participant is selected
      if (newSet.size === 0) {
        return prev;
      }
      return newSet;
    });
  };

  const handleModeChange = (mode: "equal" | "self" | "select" | "custom") => {
    setDistributionMode(mode);
    // Initialize selected participants to all members when switching to select mode
    if (mode === "select" && selectedParticipants.size === 0) {
      setSelectedParticipants(new Set(members.map(m => m.user_id)));
    }
  };

  const calculateSplitSum = () => {
    return Object.values(customSplits).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );
  };

  const resetForm = () => {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setRepeat("none");
    setCategory(DEFAULT_CATEGORIES[0].id);
    setDescription("");
    setDistributionMode("equal");
    setSelectedParticipants(new Set());
    setCustomSplits({});
    setIncomeType("salary");
    setNote("");
    setIncludedInSplit(true);
  };

  const handleSubmitExpense = () => {
    // Validate user is logged in
    if (!user?.id) {
      toast.error("Du måste vara inloggad för att lägga till utgifter");
      return false;
    }

    // Validate group exists
    if (!groupId) {
      toast.error("Ingen grupp vald");
      return false;
    }

    // Validate required fields
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

    // Validate amount is a valid positive number
    if (Number.isNaN(totalAmount) || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Ange ett giltigt belopp större än 0");
      return false;
    }

    // Validate and build splits based on distribution mode
    let splits: ExpenseSplit | null = null;

    if (distributionMode !== "equal") {
      const splitSum = calculateSplitSum();

      // Validate all split values are valid numbers
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

      // Build splits object
      splits = {};
      Object.entries(customSplits).forEach(([userId, value]) => {
        splits![userId] = parseFloat(value) || 0;
      });
    }

    try {
      onAddExpense({
        group_id: groupId,
        amount: totalAmount,
        paid_by: user.id,
        category,
        description,
        date,
        splits,
        repeat: repeat as ExpenseRepeat,
      });

      return true;
    } catch (error) {
      console.error("Error in handleSubmitExpense:", error);
      toast.error("Ett fel uppstod när utgiften skulle läggas till");
      return false;
    }
  };

  const handleSubmitIncome = async () => {
    // Validate user is logged in
    if (!user?.id) {
      toast.error("Du måste vara inloggad för att lägga till inkomster");
      return false;
    }

    // Validate group exists
    if (!groupId) {
      toast.error("Ingen grupp vald");
      return false;
    }

    // Validate required fields
    if (!amount) {
      toast.error("Ange ett belopp");
      return false;
    }

    const amountKr = parseFloat(amount);

    // Validate amount is a valid positive number
    if (
      Number.isNaN(amountKr) ||
      !Number.isFinite(amountKr) ||
      amountKr <= 0
    ) {
      toast.error("Ange ett giltigt belopp större än 0");
      return false;
    }

    // Convert to cents
    const amountCents = Math.round(amountKr * 100);

    try {
      const result = await onAddIncome({
        group_id: groupId,
        amount: amountCents,
        recipient: user.id,
        type: incomeType,
        note: note.trim() || undefined,
        date,
        repeat: repeat as IncomeRepeat,
        included_in_split: includedInSplit,
      });

      return !!result;
    } catch (error) {
      console.error("Error in handleSubmitIncome:", error);
      toast.error("Ett fel uppstod när inkomsten skulle läggas till");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let success = false;
    if (transactionType === "expense") {
      success = handleSubmitExpense();
    } else {
      success = await handleSubmitIncome();
    }

    if (success) {
      resetForm();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                  Lägg till transaktion
                </h2>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center -mr-1"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
                {/* Transaction Type Selector */}
                <div className="flex gap-2 mb-6 p-1 bg-muted rounded-md">
                  <button
                    type="button"
                    onClick={() => setTransactionType("expense")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      transactionType === "expense"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Utgift
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType("income")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      transactionType === "income"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inkomst
                  </button>
                </div>

                <form id="add-transaction-form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Amount - Common field */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm text-muted-foreground">
                      Belopp (kr)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      autoFocus
                      className="h-12 sm:h-11 text-base sm:text-sm"
                    />
                  </div>

                  {/* Expense-specific fields */}
                  {transactionType === "expense" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Kategori</Label>
                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_CATEGORIES.map((cat) => (
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
                          className="h-12 sm:h-11 text-base sm:text-sm"
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
                          className="h-12 sm:h-11 text-base sm:text-sm !w-auto !max-w-full min-w-0"
                        />
                      </div>

                      {/* Recurring section for expenses */}
                      <RecurringSection
                        value={repeat}
                        onChange={setRepeat}
                      />

                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Fördelning</Label>

                        {/* Distribution mode chips */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleModeChange("equal")}
                            className={`px-3 py-2 sm:py-1.5 rounded-md border text-sm transition-colors active:scale-95 ${
                              distributionMode === "equal"
                                ? "border-foreground bg-secondary text-foreground"
                                : "border-border hover:border-muted-foreground text-muted-foreground"
                            }`}
                          >
                            Alla jämnt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange("self")}
                            className={`px-3 py-2 sm:py-1.5 rounded-md border text-sm transition-colors active:scale-95 ${
                              distributionMode === "self"
                                ? "border-foreground bg-secondary text-foreground"
                                : "border-border hover:border-muted-foreground text-muted-foreground"
                            }`}
                          >
                            Bara jag
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange("select")}
                            className={`px-3 py-2 sm:py-1.5 rounded-md border text-sm transition-colors active:scale-95 ${
                              distributionMode === "select"
                                ? "border-foreground bg-secondary text-foreground"
                                : "border-border hover:border-muted-foreground text-muted-foreground"
                            }`}
                          >
                            Välj personer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange("custom")}
                            className={`px-3 py-2 sm:py-1.5 rounded-md border text-sm transition-colors active:scale-95 ${
                              distributionMode === "custom"
                                ? "border-foreground bg-secondary text-foreground"
                                : "border-border hover:border-muted-foreground text-muted-foreground"
                            }`}
                          >
                            Anpassad
                          </button>
                        </div>

                        {/* Equal mode info */}
                        {distributionMode === "equal" && (
                          <p className="text-xs text-muted-foreground">
                            Delas lika mellan alla gruppmedlemmar
                          </p>
                        )}

                        {/* Self mode - preview */}
                        {distributionMode === "self" && amount && (
                          <div className="p-3 border border-border rounded-md bg-secondary/20">
                            <p className="text-xs text-muted-foreground mb-2">
                              Endast du betalar denna utgift
                            </p>
                            {members.map((member) => {
                              const memberAmount = parseFloat(customSplits[member.user_id] || "0");
                              const percentage = amount ? (memberAmount / parseFloat(amount)) * 100 : 0;
                              return (
                                <div key={member.user_id} className="flex items-center justify-between text-sm py-1">
                                  <span className={member.user_id === user?.id ? "font-medium text-foreground" : "text-muted-foreground"}>
                                    {member.name}
                                  </span>
                                  <span className={member.user_id === user?.id ? "font-medium text-foreground" : "text-muted-foreground"}>
                                    {memberAmount.toFixed(2)} kr ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Select participants mode */}
                        {distributionMode === "select" && amount && (
                          <div className="space-y-3 p-3 border border-border rounded-md bg-secondary/20">
                            <p className="text-xs text-muted-foreground mb-2">
                              Välj vilka som ska dela på {parseFloat(amount).toFixed(2)} kr:
                            </p>
                            {members.map((member) => {
                              const isSelected = selectedParticipants.has(member.user_id) || selectedParticipants.size === 0;
                              const memberAmount = parseFloat(customSplits[member.user_id] || "0");
                              const percentage = amount ? (memberAmount / parseFloat(amount)) * 100 : 0;
                              return (
                                <div key={member.user_id} className="flex items-center gap-3">
                                  <Checkbox
                                    id={`participant-${member.user_id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleParticipant(member.user_id)}
                                  />
                                  <Label
                                    htmlFor={`participant-${member.user_id}`}
                                    className="flex-1 text-sm cursor-pointer flex items-center justify-between"
                                  >
                                    <span className={isSelected ? "text-foreground" : "text-muted-foreground"}>
                                      {member.name}
                                    </span>
                                    <span className={isSelected ? "text-foreground font-medium" : "text-muted-foreground"}>
                                      {memberAmount.toFixed(2)} kr ({percentage.toFixed(0)}%)
                                    </span>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Custom mode - manual amounts */}
                        {distributionMode === "custom" && amount && (
                          <div className="space-y-3 p-3 border border-border rounded-md bg-secondary/20">
                            <p className="text-xs text-muted-foreground mb-2">
                              Fördela {parseFloat(amount).toFixed(2)} kr mellan gruppmedlemmar:
                            </p>
                            {members.map((member) => (
                              <div key={member.user_id} className="flex items-center gap-2">
                                <Label className="text-sm flex-1 text-foreground truncate min-w-0">
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
                                  className="w-20 sm:w-24 h-11"
                                />
                                <span className="text-sm text-muted-foreground shrink-0">kr</span>
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
                      </div>
                    </>
                  )}

                  {/* Income-specific fields */}
                  {transactionType === "income" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Typ</Label>
                        <div className="flex flex-wrap gap-2">
                          {INCOME_TYPES.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setIncomeType(type)}
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 sm:py-1.5 text-sm transition-colors active:scale-95 ${
                                incomeType === type
                                  ? "border-foreground bg-secondary"
                                  : "border-border hover:border-muted-foreground"
                              }`}
                            >
                              <span>{getIncomeTypeIcon(type)}</span>
                              <span className="text-foreground">
                                {getIncomeTypeLabel(type)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="income-date" className="text-sm text-muted-foreground">
                          Datum
                        </Label>
                        <Input
                          id="income-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          className="h-12 sm:h-11 text-base sm:text-sm !w-auto !max-w-full min-w-0"
                        />
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
                          className="h-12 sm:h-11 text-base sm:text-sm"
                        />
                      </div>

                      {/* Recurring section for incomes */}
                      <RecurringSection
                        value={repeat}
                        onChange={setRepeat}
                      />

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
                    </>
                  )}
                </form>
              </div>

              {/* Sticky footer with save button */}
              <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-border bg-card safe-area-pb">
                <Button
                  type="submit"
                  form="add-transaction-form"
                  className="w-full h-12 sm:h-11 text-base sm:text-sm"
                >
                  Lägg till {transactionType === "expense" ? "utgift" : "inkomst"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
