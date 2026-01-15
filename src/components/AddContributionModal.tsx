import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { toast } from "sonner";
import { X } from "lucide-react";
import { handleDatabaseError } from "@/lib/errorHandling";

interface AddContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contribution: { user_id: string; amount: number; date: string; note?: string }) => void;
  groupId?: string;
  projectName: string;
}

interface UserProfileData {
  user_id: string;
  name: string | null;
}

export function AddContributionModal({
  isOpen,
  onClose,
  onAdd,
  groupId,
  projectName,
}: AddContributionModalProps) {
  const { user } = useAuth();
  const { household } = useGroups();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");
  const [members, setMembers] = useState<{ user_id: string; name: string }[]>([]);
  const previousIsOpenRef = useRef(false);

  // Fetch group members
  useEffect(() => {
    if (!groupId) return;

    const fetchMembers = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // First, get all group members
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (membersError) {
        handleDatabaseError(membersError, "Kunde inte hämta gruppmedlemmar", {
          operation: "fetchGroupMembers",
          groupId,
        });
        return;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Then, get profiles for all user_ids
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("public_profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      if (profilesError) {
        handleDatabaseError(profilesError, "Kunde inte hämta användarinformation", {
          operation: "fetchProfiles",
          userIds,
        });
        return;
      }

      const memberList = (profilesData || []).map((p: { user_id: string | null; name: string | null }) => ({
        user_id: p.user_id || "",
        name: p.name || "Okänd",
      }));

      setMembers(memberList);
    };

    fetchMembers();
  }, [groupId]);

  // Set default user when modal opens and members are loaded
  useEffect(() => {
    // Only set default when modal first opens (transitions from closed to open)
    const justOpened = isOpen && !previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (justOpened && members.length > 0) {
      // Check if current user is in the members list
      if (user) {
        const currentUserMember = members.find(m => m.user_id === user.id);
        if (currentUserMember) {
          setUserId(user.id);
          return;
        }
      }
      // If current user is not in list or no user, set first member as default
      setUserId(members[0].user_id);
    } else if (isOpen && members.length > 0 && (!userId || !members.find(m => m.user_id === userId))) {
      // If userId is not set or invalid, set default
      if (user) {
        const currentUserMember = members.find(m => m.user_id === user.id);
        if (currentUserMember) {
          setUserId(user.id);
          return;
        }
      }
      setUserId(members[0].user_id);
    }
  }, [isOpen, user, members, userId]);

  const resetForm = () => {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    // Set default user - prefer current user if in members list, otherwise first member
    if (user && members.length > 0) {
      const currentUserMember = members.find(m => m.user_id === user.id);
      setUserId(currentUserMember ? user.id : members[0].user_id);
    } else {
      setUserId(user?.id || "");
    }
    setNote("");
  };

  const validateForm = (): boolean => {
    if (!amount || !userId) {
      if (!amount) {
        toast.error("Ange ett belopp");
        return false;
      }
      if (!userId) {
        toast.error("Välj vem som gör insättningen");
        return false;
      }
      return false;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || !isFinite(amountNum) || amountNum <= 0) {
      toast.error("Ange ett giltigt belopp större än 0");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onAdd({
      user_id: userId,
      amount: parseFloat(amount),
      date,
      note: note || undefined,
    });

    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-background rounded-lg shadow-xl w-full max-w-md border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-lg font-semibold">Ny insättning</h2>
                  <p className="text-sm text-muted-foreground mt-1">{projectName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                  aria-label="Stäng dialog"
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm text-muted-foreground">
                    Belopp (kr) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                    autoFocus
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm text-muted-foreground">
                    Datum *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Member Selector */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Insättare *</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj medlem" />
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

                {/* Note */}
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm text-muted-foreground">
                    Anteckning (valfritt)
                  </Label>
                  <Input
                    id="note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="t.ex. Månadssparande"
                    className="w-full"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Avbryt
                  </Button>
                  <Button type="submit" className="flex-1">
                    Lägg till
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
