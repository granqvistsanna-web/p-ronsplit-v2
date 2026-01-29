/**
 * Loading state component shown during AI categorization
 */

import { Loader2 } from "lucide-react";

export function CategorizingStep() {
  return (
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
  );
}
