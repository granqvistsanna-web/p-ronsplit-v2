import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { toOre, toKronor, oreFromDb } from "@/lib/currency";
import { getSuggestedBudget } from "@/lib/budgetUtils";
import type { Budget, BudgetPeriod } from "@/hooks/useBudgets";
import type { Expense } from "@/lib/types";
import { toast } from "sonner";
import { X, Sparkles, Plus, Trash2 } from "lucide-react";

// Common emojis for budget categories
const EMOJI_OPTIONS = [
  "📦", "🏠", "🚗", "🛒", "🍽️", "🎬", "💊", "👕", "✈️", "🐕",
  "🪴", "🛋️", "🔧", "💡", "📱", "🎁", "🏋️", "📚", "🎨", "🎵",
  "☕", "🍺", "👶", "💇", "🧹", "🔒", "💳", "🏥", "🎓", "⚽",
];

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    budgets: {
      group_id: string;
      category: string;
      amount: number;
      enabled: boolean;
      period: BudgetPeriod;
      icon?: string | null;
    }[]
  ) => Promise<void>;
  groupId: string;
  existingBudgets: Budget[];
  expenses: Expense[];
  period?: BudgetPeriod;
}

interface BudgetInput {
  categoryId: string;
  categoryName: string;
  icon: string;
  amount: string;
  enabled: boolean;
  isCustom: boolean;
}

export function BudgetSettingsModal({
  isOpen,
  onClose,
  onSave,
  groupId,
  existingBudgets,
  expenses,
  period = "yearly",
}: BudgetSettingsModalProps) {
  const [budgetInputs, setBudgetInputs] = useState<BudgetInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📦");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  // Initialize inputs from existing budgets or defaults
  useEffect(() => {
    if (isOpen) {
      // Start with default categories
      const inputs: BudgetInput[] = DEFAULT_CATEGORIES.map((category) => {
        const existing = existingBudgets.find(
          (b) =>
            b.category.toLowerCase() === category.id.toLowerCase() &&
            b.period === period
        );
        return {
          categoryId: category.id,
          categoryName: category.name,
          icon: category.icon,
          amount: existing ? toKronor(oreFromDb(existing.amount)).toString() : "",
          enabled: existing?.enabled ?? true,
          isCustom: false,
        };
      });

      // Add custom categories from existing budgets
      const defaultCategoryIds = DEFAULT_CATEGORIES.map((c) =>
        c.id.toLowerCase()
      );
      const customBudgets = existingBudgets.filter(
        (b) =>
          !defaultCategoryIds.includes(b.category.toLowerCase()) &&
          b.period === period
      );

      for (const budget of customBudgets) {
        inputs.push({
          categoryId: budget.category,
          categoryName: budget.category,
          icon: budget.icon || "📦", // Use stored icon or default to 📦
          amount: toKronor(oreFromDb(budget.amount)).toString(),
          enabled: budget.enabled,
          isCustom: true,
        });
      }

      setBudgetInputs(inputs);
      setNewCategoryName("");
      setNewCategoryEmoji("📦");
      setShowEmojiPicker(null);
    }
  }, [isOpen, existingBudgets, period]);

  const handleAmountChange = (categoryId: string, value: string) => {
    setBudgetInputs((prev) =>
      prev.map((input) =>
        input.categoryId === categoryId ? { ...input, amount: value } : input
      )
    );
  };

  const handleEnabledChange = (categoryId: string, enabled: boolean) => {
    setBudgetInputs((prev) =>
      prev.map((input) =>
        input.categoryId === categoryId ? { ...input, enabled } : input
      )
    );
  };

  const handleIconChange = (categoryId: string, icon: string) => {
    setBudgetInputs((prev) =>
      prev.map((input) =>
        input.categoryId === categoryId ? { ...input, icon } : input
      )
    );
    setShowEmojiPicker(null);
  };

  const handleSuggestBudget = (categoryId: string) => {
    const suggested = getSuggestedBudget(expenses, categoryId);
    handleAmountChange(categoryId, suggested.toString());
  };

  const handleAddCustomCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast.error("Ange ett kategorinamn");
      return;
    }

    // Check if category already exists
    const exists = budgetInputs.some(
      (input) =>
        input.categoryId.toLowerCase() === trimmedName.toLowerCase() ||
        input.categoryName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      toast.error("Kategorin finns redan");
      return;
    }

    // Add the new custom category
    setBudgetInputs((prev) => [
      ...prev,
      {
        categoryId: trimmedName,
        categoryName: trimmedName,
        icon: newCategoryEmoji,
        amount: "",
        enabled: true,
        isCustom: true,
      },
    ]);

    setNewCategoryName("");
    setNewCategoryEmoji("📦");
    toast.success(`Kategori "${trimmedName}" tillagd`);
  };

  const handleRemoveCustomCategory = (categoryId: string) => {
    setBudgetInputs((prev) =>
      prev.filter((input) => input.categoryId !== categoryId)
    );
  };

  const handleSave = async () => {
    // Validate inputs
    const budgetsToSave = budgetInputs
      .filter((input) => input.amount && parseFloat(input.amount) > 0)
      .map((input) => ({
        group_id: groupId,
        category: input.categoryId,
        amount: toOre(parseFloat(input.amount)),
        enabled: input.enabled,
        period: period,
        icon: input.isCustom ? input.icon : null, // Only save icon for custom categories
      }));

    if (budgetsToSave.length === 0) {
      toast.error("Ange minst en budget");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(budgetsToSave);
      onClose();
    } catch {
      // Error toast is shown by the hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const totalBudget = budgetInputs.reduce((sum, input) => {
    const amount = parseFloat(input.amount) || 0;
    return sum + (input.enabled ? amount : 0);
  }, 0);

  // Separate default and custom categories
  const defaultCategories = budgetInputs.filter((input) => !input.isCustom);
  const customCategories = budgetInputs.filter((input) => input.isCustom);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-settings-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2
                id="budget-settings-title"
                className="text-lg font-semibold"
              >
                {period === "monthly" ? "Månadsbudget" : "Årsbudget"}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                disabled={isSaving}
                aria-label="Stäng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-4">
              {/* Default Categories */}
              {defaultCategories.map((input) => (
                <CategoryBudgetRow
                  key={input.categoryId}
                  input={input}
                  onAmountChange={handleAmountChange}
                  onEnabledChange={handleEnabledChange}
                  onSuggest={handleSuggestBudget}
                />
              ))}

              {/* Custom Categories Section */}
              {customCategories.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm text-muted-foreground mb-3 block">
                      Egna kategorier
                    </Label>
                  </div>
                  {customCategories.map((input) => (
                    <div key={input.categoryId} className="relative">
                      <CategoryBudgetRow
                        input={input}
                        onAmountChange={handleAmountChange}
                        onEnabledChange={handleEnabledChange}
                        onSuggest={handleSuggestBudget}
                        onRemove={handleRemoveCustomCategory}
                        onIconClick={() =>
                          setShowEmojiPicker(
                            showEmojiPicker === input.categoryId
                              ? null
                              : input.categoryId
                          )
                        }
                      />
                      {/* Emoji picker for this category */}
                      {showEmojiPicker === input.categoryId && (
                        <div className="absolute left-0 top-full mt-1 z-10 bg-background border rounded-lg shadow-lg p-2 grid grid-cols-10 gap-1 w-[280px]">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                handleIconChange(input.categoryId, emoji)
                              }
                              className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Add Custom Category */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Lägg till egen kategori
                </Label>
                <div className="flex gap-2">
                  {/* Emoji selector for new category */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowEmojiPicker(
                          showEmojiPicker === "new" ? null : "new"
                        )
                      }
                      className="h-10 w-10 flex items-center justify-center rounded-md border bg-muted/50 hover:bg-muted transition-colors text-xl"
                      title="Välj emoji"
                    >
                      {newCategoryEmoji}
                    </button>
                    {showEmojiPicker === "new" && (
                      <div className="absolute left-0 top-full mt-1 z-10 bg-background border rounded-lg shadow-lg p-2 grid grid-cols-10 gap-1 w-[280px]">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewCategoryEmoji(emoji);
                              setShowEmojiPicker(null);
                            }}
                            className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="T.ex. Inredning, Husdjur..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddCustomCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm text-muted-foreground">
                  Total {period === "monthly" ? "månads" : "års"}budget
                </Label>
                <span className="text-lg font-semibold">
                  {totalBudget.toLocaleString("sv-SE")} kr
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isSaving}
                >
                  {isSaving ? "Sparar..." : "Spara budget"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CategoryBudgetRowProps {
  input: BudgetInput;
  onAmountChange: (categoryId: string, value: string) => void;
  onEnabledChange: (categoryId: string, enabled: boolean) => void;
  onSuggest: (categoryId: string) => void;
  onRemove?: (categoryId: string) => void;
  onIconClick?: () => void;
}

function CategoryBudgetRow({
  input,
  onAmountChange,
  onEnabledChange,
  onSuggest,
  onRemove,
  onIconClick,
}: CategoryBudgetRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      {/* Category icon and name */}
      <div className="flex items-center gap-2 min-w-[120px]">
        {input.isCustom && onIconClick ? (
          <button
            type="button"
            onClick={onIconClick}
            className="text-xl hover:bg-muted p-1 rounded transition-colors"
            title="Byt emoji"
          >
            {input.icon}
          </button>
        ) : (
          <span className="text-xl">{input.icon}</span>
        )}
        <span className="font-medium text-sm">{input.categoryName}</span>
      </div>

      {/* Amount input */}
      <div className="flex-1 flex items-center gap-2">
        <Input
          type="number"
          value={input.amount}
          onChange={(e) => onAmountChange(input.categoryId, e.target.value)}
          placeholder="0"
          className="text-right"
          min="0"
          step="1000"
          disabled={!input.enabled}
        />
        <span className="text-sm text-muted-foreground w-6">kr</span>
      </div>

      {/* Suggest button */}
      <button
        onClick={() => onSuggest(input.categoryId)}
        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
        title="Föreslå baserat på historik"
        disabled={!input.enabled}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Remove button for custom categories */}
      {onRemove && (
        <button
          onClick={() => onRemove(input.categoryId)}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-950 rounded-full transition-colors text-muted-foreground hover:text-red-600"
          title="Ta bort kategori"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Enable/disable toggle */}
      <Switch
        checked={input.enabled}
        onCheckedChange={(checked) => onEnabledChange(input.categoryId, checked)}
      />
    </div>
  );
}
