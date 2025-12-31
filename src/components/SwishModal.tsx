import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupMember } from "@/hooks/useGroups";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SwishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fromUser: string, toUser: string, amount: number, date: string) => Promise<void>;
  members: GroupMember[];
  currentUserId: string;
}

export function SwishModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  currentUserId,
}: SwishModalProps) {
  const [fromUserId, setFromUserId] = useState(currentUserId);
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableRecipients = members.filter((m) => m.user_id !== fromUserId);

  const handleSubmit = async () => {
    if (!fromUserId) {
      toast.error("Välj avsändare");
      return;
    }

    if (!toUserId) {
      toast.error("Välj mottagare");
      return;
    }

    if (fromUserId === toUserId) {
      toast.error("Avsändare och mottagare kan inte vara samma person");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Ange ett giltigt belopp");
      return;
    }

    if (!date) {
      toast.error("Välj datum");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(fromUserId, toUserId, numericAmount, date);
      toast.success("Swish registrerad!");
      handleClose();
    } catch (error) {
      console.error("Error submitting Swish:", error);
      toast.error("Kunde inte registrera Swish");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFromUserId(currentUserId);
    setToUserId("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    onClose();
  };

  // Reset toUserId if fromUserId changes and they match
  const handleFromUserChange = (userId: string) => {
    setFromUserId(userId);
    if (userId === toUserId) {
      setToUserId("");
    }
  };

  const fromMember = members.find((m) => m.user_id === fromUserId);
  const toMember = members.find((m) => m.user_id === toUserId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border rounded-md p-6 w-full max-w-sm overflow-x-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Smartphone size={18} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-medium text-foreground">
                    Registrera Swish
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              <p className="text-muted-foreground text-sm mb-6">
                Registrera en Swish-betalning mellan medlemmar i hushållet.
              </p>

              {/* Form */}
              <div className="space-y-4">
                {/* Sender */}
                <div className="space-y-2">
                  <Label>Avsändare</Label>
                  <Select value={fromUserId} onValueChange={handleFromUserChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vem skickade?" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient */}
                <div className="space-y-2">
                  <Label>Mottagare</Label>
                  <Select value={toUserId} onValueChange={setToUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vem tog emot?" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRecipients.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Belopp</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      kr
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Preview */}
                {fromUserId && toUserId && amount && parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-4 px-4 bg-muted/50 rounded-md text-center"
                  >
                    <p className="text-sm text-muted-foreground mb-1">
                      {fromMember?.name} → {toMember?.name}
                    </p>
                    <p className="text-xl font-medium text-foreground">
                      {Math.round(parseFloat(amount)).toLocaleString("sv-SE")} kr
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Avbryt
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !fromUserId || !toUserId || !amount}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    "Registrera"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
