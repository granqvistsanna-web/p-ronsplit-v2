import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Expense } from "@/hooks/useExpenses";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Confetti } from "@/components/Confetti";
import { SuccessAnimation } from "@/components/SuccessAnimation";

interface CategorySuggestion {
  id: string;
  suggestedCategory: string;
  confidence: number;
  originalDescription: string;
  originalAmount: number;
}

interface RecategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onApply: (updates: { id: string; category: string }[]) => Promise<void>;
}

export function RecategorizeModal({
  isOpen,
  onClose,
  expenses,
  onApply,
}: RecategorizeModalProps) {
  const [step, setStep] = useState<"idle" | "loading" | "review">("idle");
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Filter to only uncategorized expenses (övrigt)
  const uncategorizedExpenses = expenses.filter(e => e.category === "ovrigt");

  const getCategoryInfo = (categoryId: string) => {
    return DEFAULT_CATEGORIES.find(c => c.id === categoryId) || DEFAULT_CATEGORIES.find(c => c.id === "ovrigt")!;
  };

  const handleAnalyze = async () => {
    if (uncategorizedExpenses.length === 0) {
      toast.info("Inga okategoriserade utgifter att analysera");
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("categorize-expenses", {
        body: {
          expenses: uncategorizedExpenses.map(e => ({
            id: e.id,
            description: e.description || "",
            amount: e.amount,
            date: e.date,
          })),
        },
      });

      if (error) {
        console.error("Categorization error:", error);
        toast.error("Kunde inte analysera utgifter");
        setStep("idle");
        return;
      }

      const rawSuggestions = data?.suggestions || [];
      
      // Enrich suggestions with expense details
      const enrichedSuggestions: CategorySuggestion[] = rawSuggestions
        .map((s: { id: string; suggestedCategory: string; confidence: number }) => {
          const expense = uncategorizedExpenses.find(e => e.id === s.id);
          if (!expense) return null;
          // Skip if AI also suggests "ovrigt" - no point in showing these
          if (s.suggestedCategory === "ovrigt") return null;
          return {
            ...s,
            originalDescription: expense.description || "",
            originalAmount: expense.amount,
          };
        })
        .filter(Boolean) as CategorySuggestion[];

      if (enrichedSuggestions.length === 0) {
        toast.info("AI hittade inga bättre kategorier");
        setStep("idle");
        return;
      }

      setSuggestions(enrichedSuggestions);
      // Pre-select high confidence suggestions
      setSelectedSuggestions(new Set(
        enrichedSuggestions
          .filter(s => s.confidence >= 0.7)
          .map(s => s.id)
      ));
      setStep("review");
      
      toast.success(`${enrichedSuggestions.length} förslag hittades!`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Något gick fel");
      setStep("idle");
    }
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedSuggestions(new Set());
  };

  const handleApply = async () => {
    const updates = suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({ id: s.id, category: s.suggestedCategory }));

    if (updates.length === 0) {
      toast.error("Välj minst ett förslag att tillämpa");
      return;
    }

    setApplying(true);
    try {
      await onApply(updates);
      setShowCelebration(true);
      toast.success(`${updates.length} utgifter uppdaterade!`);
      setTimeout(() => {
        setShowCelebration(false);
        handleClose();
      }, 1800);
    } catch (err) {
      console.error("Apply error:", err);
      toast.error("Kunde inte uppdatera utgifter");
      setApplying(false);
    }
  };

  const handleClose = () => {
    setStep("idle");
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setApplying(false);
    setShowCelebration(false);
    onClose();
  };

  const changeSuggestedCategory = (id: string, newCategory: string) => {
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, suggestedCategory: newCategory } : s)
    );
  };

  return (
    <AnimatePresence>
      {/* Celebration effects */}
      <Confetti isActive={showCelebration} particleCount={60} />
      <SuccessAnimation
        isVisible={showCelebration}
        type="sparkles"
        message="Kategorisering klar! ✨"
      />
      
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          >
            <div className="bg-card border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 pb-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-medium text-foreground">
                    Smart kategorisering
                  </h2>
                </div>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-2 -m-2">
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                {step === "idle" && (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Kategorisera med AI
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      AI kommer analysera dina <span className="font-medium text-foreground">{uncategorizedExpenses.length}</span> okategoriserade utgifter
                      och föreslå passande kategorier.
                    </p>
                    <Button
                      onClick={handleAnalyze}
                      disabled={uncategorizedExpenses.length === 0}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analysera utgifter
                    </Button>
                  </div>
                )}

                {step === "loading" && (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Analyserar {uncategorizedExpenses.length} utgifter...
                    </p>
                  </div>
                )}

                {step === "review" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {selectedSuggestions.size} av {suggestions.length} valda
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAll}>
                          Välj alla
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deselectAll}>
                          Avmarkera
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {suggestions.map((suggestion) => {
                        const category = getCategoryInfo(suggestion.suggestedCategory);
                        const isSelected = selectedSuggestions.has(suggestion.id);
                        
                        return (
                          <div
                            key={suggestion.id}
                            onClick={() => toggleSuggestion(suggestion.id)}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-muted-foreground"
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`
                                mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0
                                ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/50"}
                              `}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {suggestion.originalDescription || "Ingen beskrivning"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {suggestion.originalAmount.toFixed(2)} kr
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-lg">{category.icon}</span>
                                <select
                                  value={suggestion.suggestedCategory}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    changeSuggestedCategory(suggestion.id, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm bg-transparent border-none focus:outline-none cursor-pointer text-foreground"
                                >
                                  {DEFAULT_CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.icon} {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {suggestion.confidence < 0.7 && (
                              <p className="text-xs text-destructive mt-1 ml-8">
                                ⚠️ Osäker kategorisering
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === "review" && (
                <div className="shrink-0 p-4 sm:p-6 pt-4 border-t border-border bg-card">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleApply}
                      disabled={selectedSuggestions.size === 0 || applying}
                      className="flex-1 gap-2"
                    >
                      {applying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Tillämpa ({selectedSuggestions.size})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
