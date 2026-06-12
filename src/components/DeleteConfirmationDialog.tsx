import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmationDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              role="alertdialog"
              aria-modal="true"
              className="pointer-events-auto bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Bekräfta borttagning
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Är du säker på att du vill ta bort {itemType}{" "}
                  <span className="font-medium text-foreground">
                    "{itemName}"
                  </span>
                  ?
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Denna åtgärd kan inte ångras.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full sm:w-auto sm:min-w-[120px]"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={onConfirm}
                  className="w-full sm:w-auto sm:min-w-[120px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ta bort
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
