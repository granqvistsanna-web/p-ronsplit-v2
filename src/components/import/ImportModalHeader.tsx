/**
 * Modal header component with title and close button
 */

import { X } from "lucide-react";

interface ImportModalHeaderProps {
  onClose: () => void;
}

export function ImportModalHeader({ onClose }: ImportModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 shrink-0">
      <h2
        id="import-modal-title"
        className="text-lg font-semibold text-foreground tracking-tight"
      >
        Importera transaktioner
      </h2>
      <button
        onClick={onClose}
        aria-label="Stäng"
        className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg p-2 -m-2 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
}
