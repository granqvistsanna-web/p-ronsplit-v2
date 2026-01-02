import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectWithStats, SavingsContribution } from "@/hooks/useSavingsProjects";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithStats | null;
  contributions: SavingsContribution[];
  onUpdate: (updates: { name?: string; description?: string; target_amount?: number }) => void;
  onDelete: () => void;
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  contributions,
  onUpdate,
  onDelete,
}: EditProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  // Load project data when modal opens
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setTargetAmount(project.target_amount.toString());
    }
  }, [project]);

  const validateForm = (): boolean => {
    if (!name || !targetAmount) {
      if (!name) {
        toast.error("Ange ett projektnamn");
        return false;
      }
      if (!targetAmount) {
        toast.error("Ange ett målbelopp");
        return false;
      }
      return false;
    }

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      toast.error("Ange ett giltigt målbelopp större än 0");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onUpdate({
      name,
      description: description || undefined,
      target_amount: parseFloat(targetAmount),
    });
  };

  const handleDelete = () => {
    if (!project) return;

    const confirmMessage =
      project.contribution_count > 0
        ? `Är du säker på att du vill ta bort "${project.name}"? Detta kommer också ta bort alla ${project.contribution_count} insättningar.`
        : `Är du säker på att du vill ta bort "${project.name}"?`;

    if (confirm(confirmMessage)) {
      onDelete();
    }
  };

  if (!project) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-background rounded-lg shadow-xl w-full max-w-md border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
                <h2 className="text-lg font-semibold">Redigera projekt</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                  aria-label="Stäng dialog"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm text-muted-foreground">
                    Projektnamn *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="t.ex. Barnsparande, Semesterkassa"
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm text-muted-foreground">
                    Beskrivning (valfritt)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Vad sparar ni till?"
                    className="w-full resize-none"
                    rows={3}
                  />
                </div>

                {/* Target Amount */}
                <div className="space-y-2">
                  <Label htmlFor="targetAmount" className="text-sm text-muted-foreground">
                    Målbelopp (kr) *
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                {/* Project Stats */}
                <div className="pt-4 border-t space-y-2">
                  <h3 className="font-medium text-sm">Statistik</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sparat</p>
                      <p className="font-semibold text-savings">
                        {project.current_amount.toLocaleString("sv-SE")} kr
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Insättningar</p>
                      <p className="font-semibold">{project.contribution_count} st</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    className="gap-2"
                  >
                    <Trash2 size={16} />
                    Ta bort
                  </Button>
                  <div className="flex-1" />
                  <Button type="button" variant="outline" onClick={onClose}>
                    Avbryt
                  </Button>
                  <Button type="submit">Spara</Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
