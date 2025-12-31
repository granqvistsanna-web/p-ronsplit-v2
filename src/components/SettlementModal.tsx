import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GroupMember } from "@/hooks/useGroups";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromUser: GroupMember;
  toUser: GroupMember;
  amount: number;
}

export function SettlementModal({
  isOpen,
  onClose,
  onConfirm,
  fromUser,
  toUser,
  amount,
}: SettlementModalProps) {
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
            onClick={onClose}
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-foreground">Avräkning</h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <p className="text-muted-foreground text-sm mb-6">
                Bekräfta att betalningen har genomförts.
              </p>

              <div className="py-6 text-center border-t border-b border-border mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  {fromUser.name} → {toUser.name}
                </p>
                <p className="text-2xl font-medium text-foreground">
                  {Math.round(amount).toLocaleString("sv-SE")} kr
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Avbryt
                </Button>
                <Button className="flex-1" onClick={onConfirm}>
                  Bekräfta
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
