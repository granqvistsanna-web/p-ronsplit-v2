/**
 * Shared types for import modal components
 */

import type { ParsedTransaction } from "@/lib/fileParser";
import type { IncomeType, IncomeRepeat } from "@/hooks/useIncomes";
import type { Ore } from "@/lib/currency";

export type ImportStep = "upload" | "categorizing" | "review";
export type TransactionType = "expense" | "income";
export type UploadType = "file" | "image";

export interface ExtendedTransaction extends ParsedTransaction {
  transactionType: TransactionType;
}

export interface Categorization {
  index: number;
  category: string;
  isShared: boolean;
}

export interface CategorizationResponse {
  categorizations: Categorization[];
}

export interface ExpenseImport {
  group_id: string;
  amount: number;
  paid_by: string;
  category: string;
  description: string;
  date: string;
}

export interface IncomeImport {
  group_id: string;
  amount: Ore;
  recipient: string;
  type: IncomeType;
  note: string;
  date: string;
  repeat: IncomeRepeat;
  included_in_split: boolean;
}

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (expenses: ExpenseImport[]) => Promise<void>;
  onImportIncomes?: (incomes: IncomeImport[]) => Promise<void>;
  groupId: string;
  currentUserId: string;
}

// Magic bytes for file validation
export const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK.. (ZIP format)
export const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // OLE compound document

/**
 * Validate file content matches expected format using magic bytes
 */
export async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isXlsx = XLSX_MAGIC.every((b, i) => bytes[i] === b);
  const isXls = XLS_MAGIC.every((b, i) => bytes[i] === b);

  // CSV files are plain text, check for printable ASCII
  if (file.name.endsWith(".csv")) {
    const textBuffer = await file.slice(0, 100).arrayBuffer();
    const textBytes = new Uint8Array(textBuffer);
    // Check if mostly printable ASCII or valid UTF-8 (allow continuation bytes for Swedish ä/å/ö)
    return textBytes.every((b) => (b >= 0x09 && b <= 0x7e) || b >= 0x80);
  }

  return isXlsx || isXls;
}
