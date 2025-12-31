import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { GroupMember } from "@/hooks/useGroups";

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedUserIds: string[]) => Promise<void>;
  currentMembers: GroupMember[];
}

export function AddMembersModal({ isOpen, onClose, onSubmit, currentMembers }: AddMembersModalProps) {
  const { user } = useAuth();
  const { users, loading: usersLoading } = useAllUsers();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedUserIds);
      setSelectedUserIds([]);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    onClose();
  };

  // Filter out current members and current user
  const currentMemberIds = currentMembers.map(m => m.user_id);
  const availableUsers = users.filter(
    u => !currentMemberIds.includes(u.user_id) && u.user_id !== user?.id
  );

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
            <div className="bg-card border border-border rounded-md w-full max-w-md p-6 overflow-x-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-foreground">Lägg till medlemmar</h2>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {availableUsers.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-sm text-foreground">
                      Välj medlemmar att lägga till
                    </Label>
                    <div className="border border-border rounded-md max-h-64 overflow-y-auto">
                      {usersLoading ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          Laddar användare...
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {availableUsers.map((u) => (
                            <label
                              key={u.user_id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(u.user_id)}
                                onCheckedChange={() => toggleUser(u.user_id)}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                  {(u.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-foreground">{u.name || 'Okänd'}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedUserIds.length} {selectedUserIds.length === 1 ? 'medlem' : 'medlemmar'} valda
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Alla registrerade användare är redan medlemmar i denna grupp.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || selectedUserIds.length === 0}
                  >
                    {isSubmitting ? "Lägger till..." : "Lägg till"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
