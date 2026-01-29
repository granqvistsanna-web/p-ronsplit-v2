/**
 * File upload drop zone component for bank file imports (CSV, Excel)
 */

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseFile, ParseResult } from "@/lib/fileParser";
import { validateFileMagicBytes } from "./types";

interface UploadStepFileProps {
  onFilesParsed: (result: ParseResult) => void;
}

export function UploadStepFile({ onFilesParsed }: UploadStepFileProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const isCsv = file.name.endsWith(".csv");

      if (!isExcel && !isCsv) {
        toast.error("Endast CSV- och Excel-filer stöds");
        return;
      }

      // Validate file content matches expected format (magic bytes)
      const isValidContent = await validateFileMagicBytes(file);
      if (!isValidContent) {
        toast.error(
          "Filinnehållet matchar inte filtypen. Kontrollera att filen är en giltig CSV- eller Excel-fil."
        );
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

        toast.success(
          `${result.transactions.length} transaktioner hittades. Kategoriserar med AI...`
        );
        onFilesParsed(result);
      } catch (err) {
        console.error("File parsing error:", err);
        toast.error(
          (err as Error)?.message ||
            "Kunde inte läsa filen. Om det är en bank-Excel, prova exportera som CSV eller spara om som .xlsx."
        );
      }
    },
    [onFilesParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 sm:p-16 text-center transition-all duration-200
          ${
            isDragging
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
        <p className="text-muted-foreground mb-6">CSV eller Excel-format</p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            variant="outline"
            size="lg"
            className="cursor-pointer h-11 px-6"
            asChild
          >
            <span>Välj fil</span>
          </Button>
        </label>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Fungerar med de flesta svenska banker
      </p>
    </>
  );
}
