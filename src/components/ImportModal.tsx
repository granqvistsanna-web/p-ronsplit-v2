import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, ArrowUpRight, ArrowDownLeft, Image, FileText, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseFile, ParsedTransaction, ParseResult } from "@/lib/fileParser";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { toOre, Ore } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { smartCategorize, CategoryId } from "@/lib/categoryMatcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IncomeType, IncomeRepeat } from "@/hooks/useIncomes";
import type { DuplicateInfo } from "@/components/import/types";

interface Categorization {
  index: number;
  category: string;
  isShared: boolean;
}

interface CategorizationResponse {
  categorizations: Categorization[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (expenses: {
    group_id: string;
    amount: number;
    paid_by: string;
    category: string;
    description: string;
    date: string;
  }[]) => Promise<void>;
  onImportIncomes?: (incomes: {
    group_id: string;
    amount: Ore;
    recipient: string;
    type: IncomeType;
    note: string;
    date: string;
    repeat: IncomeRepeat;
    included_in_split: boolean;
  }[]) => Promise<void>;
  groupId: string;
  currentUserId: string;
}

type ImportStep = "upload" | "categorizing" | "review";
type TransactionType = "expense" | "income";

interface ExtendedTransaction extends ParsedTransaction {
  transactionType: TransactionType;
  duplicateInfo?: DuplicateInfo;
}


// Magic bytes for common file formats
const XLSX_MAGIC = [0x50, 0x4B, 0x03, 0x04]; // PK.. (ZIP format)
const XLS_MAGIC = [0xD0, 0xCF, 0x11, 0xE0];  // OLE compound document

async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isXlsx = XLSX_MAGIC.every((b, i) => bytes[i] === b);
  const isXls = XLS_MAGIC.every((b, i) => bytes[i] === b);

  // CSV files are plain text, check for printable ASCII
  if (file.name.endsWith('.csv')) {
    const textBuffer = await file.slice(0, 100).arrayBuffer();
    const textBytes = new Uint8Array(textBuffer);
    // Check if mostly printable ASCII (allow some extended chars for Swedish)
    return textBytes.every(b => (b >= 0x09 && b <= 0x7E) || b >= 0xC0);
  }

  return isXlsx || isXls;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Kunde inte läsa bildfilen"));
      }
    };
    reader.onerror = () => reject(new Error("Kunde inte läsa bildfilen"));
    reader.readAsDataURL(file);
  });
}

function getInvokeErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "context" in error &&
    error.context &&
    typeof error.context === "object" &&
    "status" in error.context &&
    typeof error.context.status === "number"
  ) {
    return error.context.status;
  }

  return undefined;
}

/**
 * Check imported transactions against existing ones for duplicates.
 * Client-side matching by fetching existing data for the date range.
 */
async function checkImportDuplicates(
  transactions: ExtendedTransaction[],
  groupId: string,
): Promise<ExtendedTransaction[]> {
  if (transactions.length === 0) return transactions;

  // Get date range from transactions
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  if (dates.length === 0) return transactions;

  const minDate = shiftDate(dates[0], -2);
  const maxDate = shiftDate(dates[dates.length - 1], 2);

  // Fetch existing expenses and incomes in parallel
  const [expRes, incRes] = await Promise.all([
    supabase.from("expenses").select("id, amount, date, description, category")
      .eq("group_id", groupId).gte("date", minDate).lte("date", maxDate),
    supabase.from("incomes").select("id, amount, date, type, note")
      .eq("group_id", groupId).gte("date", minDate).lte("date", maxDate),
  ]);

  const existingExpenses = expRes.data || [];
  const existingIncomes = incRes.data || [];

  return transactions.map(t => {
    const reasons: string[] = [];
    let matchId: string | undefined;

    if (t.transactionType === "expense") {
      for (const ex of existingExpenses) {
        const amountMatch = ex.amount != null && Math.abs(ex.amount - t.amount) < 0.01;
        const dateMatch = ex.date === t.date;
        const descMatch = ex.description && t.description &&
          stringSim(ex.description.toLowerCase(), t.description.toLowerCase()) > 0.6;

        if (amountMatch && dateMatch) {
          reasons.push("Samma belopp", "Samma datum");
          if (descMatch) reasons.push("Liknande beskrivning");
          matchId = ex.id;
          break;
        }
        if (amountMatch && descMatch) {
          reasons.push("Samma belopp", "Liknande beskrivning");
          matchId = ex.id;
          break;
        }
      }
    } else {
      const amountOre = toOre(t.amount);
      for (const inc of existingIncomes) {
        const amountMatch = Math.abs(inc.amount - amountOre) < 1;
        const dateMatch = inc.date === t.date;

        if (amountMatch && dateMatch) {
          reasons.push("Samma belopp", "Samma datum");
          matchId = inc.id;
          break;
        }
      }
    }

    if (matchId && reasons.length > 0) {
      return { ...t, duplicateInfo: { existingId: matchId, matchReasons: reasons }, isShared: false };
    }
    return t;
  });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function stringSim(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (bigramsA.has(b.substring(i, i + 2))) matches++;
  }
  return (2 * matches) / (a.length - 1 + b.length - 1);
}

export function ImportModal({
  isOpen,
  onClose,
  onImportExpenses,
  onImportIncomes,
  groupId,
  currentUserId
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadType, setUploadType] = useState<"file" | "image">("file");
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Process parsed transactions through smart categorization (keywords → history → AI)
  const categorizeTransactions = useCallback(async (
    parsed: ParsedTransaction[],
    defaultType: TransactionType = "expense"
  ) => {
    const extended: ExtendedTransaction[] = parsed.map(t => ({
      ...t,
      transactionType: defaultType,
    }));

    setTransactions(extended);
    setStep("categorizing");

    // Step 1: Smart categorization (keywords + history)
    const transactionsToMatch = parsed.map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date,
    }));

    const { matched, needsAi } = await smartCategorize(transactionsToMatch, groupId);

    // Build initial categories from smart matching
    const categories = new Map<number, { category: CategoryId; isShared: boolean }>();
    for (const m of matched) {
      categories.set(m.index, { category: m.category, isShared: m.isShared });
    }

    const smartMatchedCount = matched.length;

    // Step 2: Call AI only for unmatched transactions
    if (needsAi.length > 0) {
      const unmatchedTransactions = needsAi.map(i => ({
        date: parsed[i].date,
        description: parsed[i].description,
        amount: parsed[i].amount,
        originalIndex: i,
      }));

        const { data, error } = await supabase.functions.invoke("categorize-expenses", {
          body: {
            expenses: unmatchedTransactions.map(t => ({
              id: `unmatched-${t.originalIndex}`,
              date: t.date,
              description: t.description,
              amount: t.amount,
            })),
          },
        });

      if (error) {
        console.error("AI categorization error:", error);
        // Fallback for AI errors
        for (const i of needsAi) {
          categories.set(i, { category: "ovrigt" as CategoryId, isShared: true });
        }
      } else if (data?.suggestions) {
        for (const suggestion of data.suggestions) {
          // Find original index from the expense id
          const unmatchedEntry = unmatchedTransactions.find(
            (t) => `unmatched-${t.originalIndex}` === suggestion.id
          );
          if (unmatchedEntry) {
            categories.set(unmatchedEntry.originalIndex, {
              category: (suggestion.suggestedCategory || "ovrigt") as CategoryId,
              isShared: true,
            });
          }
        }
      }
    }

    // Combine all categorizations
    const categorized = extended.map((t, i) => {
      const cat = categories.get(i);
      return {
        ...t,
        category: cat?.category || "ovrigt",
        isShared: cat?.isShared ?? true,
      };
    });

    // Check for duplicates before showing review
    const withDuplicates = await checkImportDuplicates(categorized, groupId);
    const dupCount = withDuplicates.filter(t => t.duplicateInfo).length;
    if (dupCount > 0) {
      toast.warning(`${dupCount} möjliga dubletter hittades och har markerats`);
    }

    setTransactions(withDuplicates);
    setStep("review");

    // Show toast with summary
    if (smartMatchedCount > 0) {
      toast.success(`${smartMatchedCount} kategoriserades direkt, ${needsAi.length} via AI`);
    }
  }, [groupId]);

  const handleFileUpload = useCallback(async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      toast.error("Endast CSV- och Excel-filer stöds");
      return;
    }

    // Validate file content matches expected format (magic bytes)
    const isValidContent = await validateFileMagicBytes(file);
    if (!isValidContent) {
      toast.error("Filinnehållet matchar inte filtypen. Kontrollera att filen är en giltig CSV- eller Excel-fil.");
      return;
    }

    try {
      let result: ParseResult;

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        result = await parseFile(buffer, file.name);

        // Fallback: some banks export ".xls" that is actually HTML/text
        if (result.transactions.length === 0 && !result.error) {
          const text = await file.text();
          result = await parseFile(text, file.name);
        }
      } else {
        const content = await file.text();
        result = await parseFile(content, file.name);
      }

      // Show error if parsing failed
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Show warning if present
      if (result.warning) {
        toast.warning(result.warning);
      }

      if (result.transactions.length === 0) {
        toast.error("Inga transaktioner hittades i filen.");
        return;
      }

      toast.success(`${result.transactions.length} transaktioner hittades. Kategoriserar med AI...`);
      await categorizeTransactions(result.transactions, "expense");

    } catch (err) {
      console.error("File parsing error:", err);
      toast.error(
        (err as Error)?.message ||
        "Kunde inte läsa filen. Om det är en bank-Excel, prova exportera som CSV eller spara om som .xlsx."
      );
    }
  }, [categorizeTransactions]);

  const handleImageUpload = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast.error("Endast bilder stöds (PNG, JPG, etc.)");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bilden är för stor. Max 10MB.");
      return;
    }

    try {
      setStep("categorizing");
      toast.info("Analyserar kontoutdrag med AI...");

      // Convert to base64 via Data URL (more robust for binary image data)
      const dataUrl = await readFileAsDataUrl(file);
      const [header, base64] = dataUrl.split(",");

      if (!base64) {
        throw new Error("Ogiltig bilddata");
      }

      const mimeMatch = header.match(/^data:(.*?);base64$/);
      const mimeType = mimeMatch?.[1] || file.type || "image/png";

      // Call the edge function to analyze the image
      const { data, error } = await supabase.functions.invoke("analyze-bank-image", {
        body: {
          imageBase64: base64,
          mimeType,
        },
      });

      if (error) {
        const status = getInvokeErrorStatus(error);
        console.error("Image analysis error:", { status, error });

        if (status === 401) {
          toast.error("Din session har gått ut. Logga in igen och försök igen.");
        } else if (status === 413) {
          toast.error("Bilden är för stor att analysera. Testa en mindre eller komprimerad bild.");
        } else {
          toast.error("Kunde inte analysera bilden. Försök igen.");
        }

        setStep("upload");
        return;
      }

      const transactions = data?.transactions || [];

      if (transactions.length === 0) {
        toast.error("Inga transaktioner hittades i bilden. Prova en tydligare bild.");
        setStep("upload");
        return;
      }

      toast.success(`${transactions.length} transaktioner hittades!`);

      // Convert to ParsedTransaction format
      const parsed: ParsedTransaction[] = transactions.map((t: { date: string; description: string; amount: number; type: string }, index: number) => ({
        id: `img-${Date.now()}-${index}`,
        date: t.date,
        description: t.description,
        amount: Math.abs(t.amount),
        category: "ovrigt",
        isShared: true,
        selected: true,
      }));

      // Create extended transactions with type from AI
      const extended: ExtendedTransaction[] = parsed.map((p, i) => ({
        ...p,
        transactionType: (transactions[i]?.type === "income" ? "income" : "expense") as TransactionType,
      }));

      // Now categorize them using smart categorization
      setTransactions(extended);

      // Step 1: Smart categorization (keywords + history)
      const transactionsToMatch = parsed.map(t => ({
        description: t.description,
        amount: t.amount,
        date: t.date,
      }));

      const { matched, needsAi } = await smartCategorize(transactionsToMatch, groupId);

      // Build initial categories from smart matching
      const categories = new Map<number, { category: CategoryId; isShared: boolean }>();
      for (const m of matched) {
        categories.set(m.index, { category: m.category, isShared: m.isShared });
      }

      const smartMatchedCount = matched.length;

      // Step 2: Call AI only for unmatched transactions
      if (needsAi.length > 0) {
        const unmatchedTransactions = needsAi.map(i => ({
          date: parsed[i].date,
          description: parsed[i].description,
          amount: parsed[i].amount,
          originalIndex: i,
        }));

        const { data: catData, error: catError } = await supabase.functions.invoke("categorize-expenses", {
          body: {
            expenses: unmatchedTransactions.map(t => ({
              id: `unmatched-${t.originalIndex}`,
              date: t.date,
              description: t.description,
              amount: t.amount,
            })),
          },
        });

        if (catError) {
          console.error("AI categorization error:", catError);
          for (const i of needsAi) {
            categories.set(i, { category: "ovrigt" as CategoryId, isShared: true });
          }
        } else if (catData?.suggestions) {
          for (const suggestion of catData.suggestions) {
            const unmatchedEntry = unmatchedTransactions.find(
              (t) => `unmatched-${t.originalIndex}` === suggestion.id
            );
            if (unmatchedEntry) {
              categories.set(unmatchedEntry.originalIndex, {
                category: (suggestion.suggestedCategory || "ovrigt") as CategoryId,
                isShared: true,
              });
            }
          }
        }
      }

      // Combine all categorizations, preserving transactionType from image analysis
      const categorized = extended.map((t, i) => {
        const cat = categories.get(i);
        return {
          ...t,
          category: cat?.category || "ovrigt",
          isShared: cat?.isShared ?? true,
        };
      });

      setTransactions(categorized);
      setStep("review");

      if (smartMatchedCount > 0) {
        toast.success(`${smartMatchedCount} kategoriserades direkt, ${needsAi.length} via AI`);
      }

    } catch (err) {
      console.error("Image upload error:", err);
      toast.error((err as Error)?.message || "Kunde inte bearbeta bilden. Försök igen.");
      setStep("upload");
    }
  }, [groupId]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const updateCategory = (id: string, category: string) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, category } : t)
    );
  };

  const toggleShared = (id: string) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, isShared: !t.isShared } : t)
    );
  };

  const toggleTransactionType = (id: string) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? {
        ...t,
        transactionType: t.transactionType === "expense" ? "income" : "expense"
      } : t)
    );
  };

  const handleImport = async () => {
    // Only import transactions marked as shared
    const toImport = transactions.filter(t => t.isShared);

    if (toImport.length === 0) {
      toast.error("Inga delade transaktioner att importera");
      return;
    }

    // Split into expenses and incomes
    const selectedExpenses = toImport.filter(t => t.transactionType === "expense");
    const selectedIncomes = toImport.filter(t => t.transactionType === "income");

    // Validate and prepare expenses
    const expenses = selectedExpenses
      .filter(t => {
        if (!Number.isFinite(t.amount) || t.amount <= 0) {
          console.warn(`Skipping transaction with invalid amount: ${t.id}`, t);
          return false;
        }
        if (!t.description || t.description.trim() === "") {
          console.warn(`Skipping transaction with empty description: ${t.id}`, t);
          return false;
        }
        if (!t.date) {
          console.warn(`Skipping transaction with missing date: ${t.id}`, t);
          return false;
        }
        return true;
      })
      .map(t => ({
        group_id: groupId,
        amount: t.amount,
        paid_by: currentUserId,
        category: t.category || "ovrigt",
        description: t.description.trim(),
        date: t.date,
      }));

    // Validate and prepare incomes
    const incomes = selectedIncomes
      .filter(t => {
        if (!Number.isFinite(t.amount) || t.amount <= 0) return false;
        if (!t.date) return false;
        return true;
      })
      .map(t => ({
        group_id: groupId,
        amount: toOre(t.amount),
        recipient: currentUserId,
        type: "other" as IncomeType,
        note: t.description?.trim() || "",
        date: t.date,
        repeat: "none" as IncomeRepeat,
        included_in_split: t.isShared ?? true,
      }));

    const itemsToImport = expenses.length + incomes.length;

    if (itemsToImport === 0) {
      toast.error("Inga giltiga transaktioner att importera");
      return;
    }

    try {
      if (expenses.length > 0) {
        await onImportExpenses(expenses);
      }

      if (incomes.length > 0 && onImportIncomes) {
        await onImportIncomes(incomes);
      }

      const skipped = toImport.length - itemsToImport;
      if (skipped > 0) {
        toast.warning(`${skipped} ogiltiga transaktioner hoppades över`);
      }

      // Success toasts are shown by the hooks (addExpenses/addIncomes)

      setStep("upload");
      setTransactions([]);
      onClose();
    } catch (error) {
      console.error('[ImportModal] Import failed:', error);
      // Error toasts are shown by the hooks, but add a fallback
      toast.error("Importen misslyckades. Försök igen.");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setTransactions([]);
    onClose();
  };

  // Calculate shared transactions for import preview
  const sharedExpenses = transactions.filter(t => t.isShared && t.transactionType === "expense");
  const sharedIncomes = transactions.filter(t => t.isShared && t.transactionType === "income");
  const totalToImport = sharedExpenses.length + sharedIncomes.length;

  const totalExpenseAmount = sharedExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncomeAmount = sharedIncomes.reduce((sum, t) => sum + t.amount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 overflow-hidden"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-modal-title"
              className="bg-card border border-border shadow-notion-xl rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header - minimal and clean */}
              <div className="flex items-center justify-between px-6 py-5 shrink-0">
                <h2 id="import-modal-title" className="text-lg font-semibold text-foreground tracking-tight">Importera transaktioner</h2>
                <button
                  onClick={handleClose}
                  aria-label="Stäng"
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg p-2 -m-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {step === "upload" && (
                  <div className="px-6 pb-8">
                    <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "file" | "image")} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-muted/50">
                        <TabsTrigger value="file" className="flex items-center gap-2.5 text-sm font-medium data-[state=active]:shadow-sm">
                          <FileText size={18} />
                          <span>Bankfil</span>
                        </TabsTrigger>
                        <TabsTrigger value="image" className="flex items-center gap-2.5 text-sm font-medium data-[state=active]:shadow-sm">
                          <Image size={18} />
                          <span>Skärmdump</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="file" className="mt-0">
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={`
                            relative border-2 border-dashed rounded-xl p-12 sm:p-16 text-center transition-all duration-200
                            ${isDragging
                              ? "border-primary bg-primary/5 scale-[1.01]"
                              : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                            }
                          `}
                        >
                          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                            <Upload size={28} className="text-muted-foreground" />
                          </div>
                          <p className="text-lg font-medium text-foreground mb-2">
                            Släpp din bankfil här
                          </p>
                          <p className="text-muted-foreground mb-6">
                            CSV eller Excel-format
                          </p>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <label htmlFor="file-upload">
                            <Button variant="outline" size="lg" className="cursor-pointer h-11 px-6" asChild>
                              <span>Välj fil</span>
                            </Button>
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-4">
                          Fungerar med de flesta svenska banker
                        </p>
                      </TabsContent>

                      <TabsContent value="image" className="mt-0">
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files[0];
                            if (file) handleImageUpload(file);
                          }}
                          className={`
                            relative border-2 border-dashed rounded-xl p-12 sm:p-16 text-center transition-all duration-200
                            ${isDragging
                              ? "border-primary bg-primary/5 scale-[1.01]"
                              : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                            }
                          `}
                        >
                          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                            <Image size={28} className="text-muted-foreground" />
                          </div>
                          <p className="text-lg font-medium text-foreground mb-2">
                            Släpp en skärmdump här
                          </p>
                          <p className="text-muted-foreground mb-6">
                            PNG, JPG eller skärmklipp
                          </p>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload">
                            <Button variant="outline" size="lg" className="cursor-pointer h-11 px-6" asChild>
                              <span>Välj bild</span>
                            </Button>
                          </label>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Sparkles size={14} className="text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            AI läser av transaktionerna automatiskt
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {step === "categorizing" && (
                  <div className="text-center py-20 px-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Loader2 size={28} className="text-primary animate-spin" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Kategoriserar...
                    </p>
                    <p className="text-muted-foreground">
                      AI analyserar dina transaktioner
                    </p>
                  </div>
                )}

                {step === "review" && (
                  <div className="flex flex-col h-full">
                    {/* Summary bar - compact and informative */}
                    <div className="px-6 pb-4">
                      <div className="flex items-center justify-between gap-4 p-4 bg-muted/40 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-medium text-foreground">{totalToImport}</span>
                            <span className="text-muted-foreground"> av {transactions.length} delade</span>
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
                            onCategoryChange={(cat) => updateCategory(t.id, cat)}
                            onToggleShared={() => toggleShared(t.id)}
                            onToggleType={() => toggleTransactionType(t.id)}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {/* Actions - sticky footer */}
                    <div className="shrink-0 px-6 py-5 border-t border-border bg-card">
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 h-12" onClick={handleClose}>
                          Avbryt
                        </Button>
                        <Button
                          className="flex-1 h-12 font-medium"
                          onClick={handleImport}
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
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TransactionRow({
  transaction,
  onCategoryChange,
  onToggleShared,
  onToggleType,
}: {
  transaction: ExtendedTransaction;
  onCategoryChange: (category: string) => void;
  onToggleShared: () => void;
  onToggleType: () => void;
}) {
  const category = DEFAULT_CATEGORIES.find(c => c.id === transaction.category);
  const isExpense = transaction.transactionType === "expense";
  const isActive = transaction.isShared;

  // Safe date parsing with fallback
  let formattedDate = "Ogiltigt datum";
  try {
    const date = new Date(transaction.date);
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
    }
  } catch (error) {
    console.warn("Invalid date in transaction:", transaction.id, transaction.date);
  }

  // Safe amount validation
  const safeAmount = Number.isFinite(transaction.amount) && transaction.amount >= 0
    ? transaction.amount
    : 0;

  return (
    <div className={`
      rounded-xl border p-4 transition-all duration-150
      ${isActive
        ? "border-border bg-card hover:border-primary/30"
        : "border-transparent bg-muted/40 opacity-50"
      }
    `}>
      <div className="flex items-center gap-4">
        {/* Type toggle - larger touch target */}
        <button
          onClick={onToggleType}
          className={`
            p-2.5 rounded-xl shrink-0 transition-all duration-150 active:scale-95
            ${isExpense ? "bg-expense/10 hover:bg-expense/15" : "bg-income/10 hover:bg-income/15"}
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {formattedDate}
          </p>
        </div>

        {/* Amount */}
        <p className={`text-number font-semibold shrink-0 ${
          isExpense ? "text-expense" : "text-income"
        }`}>
          {isExpense ? "-" : "+"}{safeAmount.toLocaleString("sv-SE")} kr
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
            {DEFAULT_CATEGORIES.map(cat => (
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
            ${transaction.isShared
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
