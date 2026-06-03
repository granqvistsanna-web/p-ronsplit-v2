import { useMemo, useState } from "react";
import { Trash2, AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { findDuplicateGroups, formatAmount } from "@/lib/findDuplicates";
import type { Expense } from "@/hooks/useExpenses";
import type { Income } from "@/hooks/useIncomes";
import type { GroupMember } from "@/hooks/useGroups";

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  incomes: Income[];
  members: GroupMember[];
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
}

export function DuplicatesModal({
  isOpen,
  onClose,
  expenses,
  incomes,
  members,
  onDeleteExpense,
  onDeleteIncome,
}: DuplicatesModalProps) {
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => findDuplicateGroups(expenses, incomes),
    [expenses, incomes]
  );

  const memberName = (id: string) =>
    members.find((m) => m.user_id === id)?.name || "Okänd";

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const handleDelete = async (type: "expense" | "income", id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      if (type === "expense") await onDeleteExpense(id);
      else await onDeleteIncome(id);
      setDeleted((prev) => new Set(prev).add(id));
      toast.success("Borttagen");
    } catch (err) {
      console.error("delete duplicate failed", err);
      toast.error("Kunde inte ta bort");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalSuspects = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            Hitta dubletter
          </DialogTitle>
          <DialogDescription>
            {groups.length === 0
              ? "Inga troliga dubletter hittades bland dina transaktioner."
              : `Hittade ${groups.length} ${
                  groups.length === 1 ? "grupp" : "grupper"
                } med möjliga dubletter (${totalSuspects} transaktioner). Granska och ta bort de du inte vill behålla.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {groups.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.type === "expense" ? "Utgifter" : "Inkomster"} ·{" "}
                  {group.items.length} möjliga dubletter
                </div>
                <div className="divide-y divide-border/40">
                  {group.items.map((item) => {
                    const isDeleted = deleted.has(item.id);
                    const isDeleting = deleting.has(item.id);
                    const isExpense = group.type === "expense";
                    const expense = isExpense ? (item as Expense) : null;
                    const income = !isExpense ? (item as Income) : null;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 transition-opacity ${
                          isDeleted ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {expense
                              ? expense.description || expense.category
                              : income?.note || income?.type || "Inkomst"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(item.date)}
                            {" · "}
                            {expense
                              ? memberName(expense.paid_by)
                              : memberName(income!.recipient)}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            isExpense ? "text-expense" : "text-income"
                          }`}
                        >
                          {isExpense ? "-" : "+"}
                          {formatAmount(item.amount, !isExpense)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={isDeleting || isDeleted}
                          onClick={() => handleDelete(group.type, item.id)}
                          aria-label="Ta bort"
                        >
                          {isDeleted ? <Check size={16} /> : <Trash2 size={16} />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}