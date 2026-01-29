import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GroupMember {
  user_id: string;
  name?: string;
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
}

export interface MemberSettingsProps {
  group: Group;
  profile: { user_id?: string } | null;

  // Edit household name
  isEditingHouseholdName: boolean;
  editingHouseholdName: string;
  setEditingHouseholdName: (name: string) => void;
  onEditHouseholdName: () => void;
  onSaveHouseholdName: () => void;
  onCancelEditHouseholdName: () => void;

  // Add members
  onOpenAddMembersModal: () => void;

  // Remove member
  onRemoveMember: (userId: string) => void;
}

export const MemberSettings = ({
  group,
  profile,
  isEditingHouseholdName,
  editingHouseholdName,
  setEditingHouseholdName,
  onEditHouseholdName,
  onSaveHouseholdName,
  onCancelEditHouseholdName,
  onOpenAddMembersModal,
  onRemoveMember,
}: MemberSettingsProps) => {
  return (
    <div className="pt-3 border-t border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Medlemmar
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditHouseholdName}
            className="h-7 text-xs gap-1"
          >
            <Edit2 size={12} />
            Ändra namn
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAddMembersModal}
            className="h-7 text-xs gap-1"
          >
            <Plus size={12} />
            Bjud in
          </Button>
        </div>
      </div>

      {isEditingHouseholdName && (
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={editingHouseholdName}
            onChange={(e) => setEditingHouseholdName(e.target.value)}
            className="max-w-xs h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveHouseholdName();
              } else if (e.key === "Escape") {
                onCancelEditHouseholdName();
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveHouseholdName}
            className="h-8 w-8 p-0"
          >
            <Check size={14} className="text-green-500 dark:text-green-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEditHouseholdName}
            className="h-8 w-8 p-0"
          >
            <X size={14} className="text-destructive" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {group.members.map((member) => {
          const isCurrentUser = member.user_id === profile?.user_id;
          const canRemove = !isCurrentUser;

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/30"
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {member.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isCurrentUser ? "Du" : "Medlem"}
                </p>
              </div>
              {canRemove && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ta bort medlem</AlertDialogTitle>
                      <AlertDialogDescription>
                        Är du säker på att du vill ta bort {member.name} från gruppen "{group.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemoveMember(member.user_id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Ta bort
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
