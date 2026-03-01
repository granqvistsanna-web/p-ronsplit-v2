/**
 * Hook for categorizing transactions using smart matching (keywords + history) and AI fallback
 */

import { useCallback } from "react";
import { toast } from "sonner";
import type { ParsedTransaction } from "@/lib/fileParser";
import { supabase } from "@/integrations/supabase/client";
import { smartCategorize, CategoryId } from "@/lib/categoryMatcher";
import type {
  ExtendedTransaction,
  TransactionType,
} from "./types";

interface UseCategorizeOptions {
  groupId: string;
  onStartCategorizing: (transactions: ExtendedTransaction[]) => void;
  onCategorized: (transactions: ExtendedTransaction[]) => void;
}

export function useCategorization({
  groupId,
  onStartCategorizing,
  onCategorized,
}: UseCategorizeOptions) {
  const categorizeTransactions = useCallback(
    async (
      parsed: ParsedTransaction[],
      defaultType: TransactionType = "expense"
    ) => {
      const extended: ExtendedTransaction[] = parsed.map((t) => ({
        ...t,
        transactionType: defaultType,
      }));

      onStartCategorizing(extended);

      // Step 1: Smart categorization (keywords + history)
      const transactionsToMatch = parsed.map((t) => ({
        description: t.description,
        amount: t.amount,
        date: t.date,
      }));

      const { matched, needsAi } = await smartCategorize(
        transactionsToMatch,
        groupId
      );

      // Build initial categories from smart matching
      const categories = new Map<
        number,
        { category: CategoryId; isShared: boolean }
      >();
      for (const m of matched) {
        categories.set(m.index, { category: m.category, isShared: m.isShared });
      }

      const smartMatchedCount = matched.length;

      // Step 2: Call AI only for unmatched transactions
      if (needsAi.length > 0) {
        const unmatchedTransactions = needsAi.map((i) => ({
          date: parsed[i].date,
          description: parsed[i].description,
          amount: parsed[i].amount,
          originalIndex: i,
        }));

        const { data, error } = await supabase.functions.invoke(
          "categorize-expenses",
          {
            body: {
              expenses: unmatchedTransactions.map((t) => ({
                id: `unmatched-${t.originalIndex}`,
                date: t.date,
                description: t.description,
                amount: t.amount,
              })),
            },
          }
        );

        if (error) {
          console.error("AI categorization error:", error);
          // Fallback for AI errors
          for (const i of needsAi) {
            categories.set(i, {
              category: "ovrigt" as CategoryId,
              isShared: true,
            });
          }
        } else if (data?.suggestions) {
          for (const suggestion of data.suggestions) {
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

      onCategorized(categorized);

      // Show toast with summary
      if (smartMatchedCount > 0) {
        toast.success(
          `${smartMatchedCount} kategoriserades direkt, ${needsAi.length} via AI`
        );
      }
    },
    [groupId, onStartCategorizing, onCategorized]
  );

  return { categorizeTransactions };
}

/**
 * Categorize transactions from image analysis
 * Preserves the transaction type from the AI image analysis
 */
export async function categorizeImageTransactions(
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: string;
  }>,
  groupId: string
): Promise<ExtendedTransaction[]> {
  // Convert to ParsedTransaction format
  const parsed: ParsedTransaction[] = transactions.map((t, index) => ({
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
    transactionType: (transactions[i]?.type === "income"
      ? "income"
      : "expense") as TransactionType,
  }));

  // Step 1: Smart categorization (keywords + history)
  const transactionsToMatch = parsed.map((t) => ({
    description: t.description,
    amount: t.amount,
    date: t.date,
  }));

  const { matched, needsAi } = await smartCategorize(transactionsToMatch, groupId);

  // Build initial categories from smart matching
  const categories = new Map<
    number,
    { category: CategoryId; isShared: boolean }
  >();
  for (const m of matched) {
    categories.set(m.index, { category: m.category, isShared: m.isShared });
  }

  const smartMatchedCount = matched.length;

  // Step 2: Call AI only for unmatched transactions
  if (needsAi.length > 0) {
    const unmatchedTransactions = needsAi.map((i) => ({
      date: parsed[i].date,
      description: parsed[i].description,
      amount: parsed[i].amount,
      originalIndex: i,
    }));

    const { data: catData, error: catError } = await supabase.functions.invoke(
      "categorize-expenses",
      {
        body: {
          expenses: unmatchedTransactions.map((t) => ({
            id: `unmatched-${t.originalIndex}`,
            date: t.date,
            description: t.description,
            amount: t.amount,
          })),
        },
      }
    );

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

  if (smartMatchedCount > 0) {
    toast.success(
      `${smartMatchedCount} kategoriserades direkt, ${needsAi.length} via AI`
    );
  }

  return categorized;
}
