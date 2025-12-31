import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type RepeatInterval = "none" | "monthly" | "yearly";

interface RecurringSectionProps {
  value: RepeatInterval;
  onChange: (value: RepeatInterval) => void;
  defaultOpen?: boolean;
}

const REPEAT_OPTIONS: { value: RepeatInterval; label: string }[] = [
  { value: "none", label: "Ingen upprepning" },
  { value: "monthly", label: "Varje månad" },
  { value: "yearly", label: "Varje år" },
];

export function RecurringSection({
  value,
  onChange,
  defaultOpen = false,
}: RecurringSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || value !== "none");

  const selectedLabel = REPEAT_OPTIONS.find((o) => o.value === value)?.label || "Ingen upprepning";

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Återkommande</span>
          {value !== "none" && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {selectedLabel}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border">
              <Label className="text-xs text-muted-foreground mb-3 block">
                Välj hur ofta transaktionen ska upprepas
              </Label>
              <div className="flex flex-wrap gap-2">
                {REPEAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-colors active:scale-95",
                      value === option.value
                        ? "bg-secondary text-foreground border border-foreground"
                        : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
