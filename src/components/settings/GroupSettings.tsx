import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Check, X, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { MemberSettings, MemberSettingsProps } from "./MemberSettings";

interface GroupMember {
  user_id: string;
  name?: string;
}

interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  created_by?: string;
}

export interface GroupSettingsProps {
  household: Group | null;
  allGroups: Group[];
  loading: boolean;
  profile: { user_id?: string } | null;

  // Join by code
  inviteCodeInput: string;
  setInviteCodeInput: (code: string) => void;
  isJoiningGroup: boolean;
  onJoinByCode: () => void;

  // Create group
  isCreatingGroup: boolean;
  setIsCreatingGroup: (creating: boolean) => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  onCreateGroup: () => void;

  // Group actions
  onSelectGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;

  // Member settings props (for active group)
  memberSettingsProps: Omit<MemberSettingsProps, 'group' | 'profile'>;
}

export const GroupSettings = ({
  household,
  allGroups,
  loading,
  profile,
  inviteCodeInput,
  setInviteCodeInput,
  isJoiningGroup,
  onJoinByCode,
  isCreatingGroup,
  setIsCreatingGroup,
  newGroupName,
  setNewGroupName,
  onCreateGroup,
  onSelectGroup,
  onDeleteGroup,
  memberSettingsProps,
}: GroupSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Mina grupper</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingGroup(true)}
            className="gap-2"
          >
            <Plus size={14} />
            Ny grupp
          </Button>
        </div>
        <CardDescription>Hantera dina grupper och medlemmar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Join group by invite code */}
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <Label htmlFor="inviteCode" className="text-sm font-medium">
                Gå med i grupp via inbjudningskod
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="inviteCode"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="T.ex. ABC123"
                  className="flex-1 uppercase tracking-widest font-mono"
                  maxLength={8}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onJoinByCode();
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={onJoinByCode}
                  disabled={isJoiningGroup || !inviteCodeInput.trim()}
                  className="gap-1"
                >
                  {isJoiningGroup ? "Går med..." : "Gå med"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Be en gruppmedlem om koden för att gå med i deras grupp
              </p>
            </div>

            {/* Create new group form */}
            {isCreatingGroup && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <Label htmlFor="newGroupName" className="text-sm font-medium">
                  Namn på ny grupp
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="newGroupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="T.ex. Familjen, Kompisar..."
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onCreateGroup();
                      } else if (e.key === "Escape") {
                        setIsCreatingGroup(false);
                        setNewGroupName("");
                      }
                    }}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onCreateGroup}
                    className="gap-1"
                  >
                    <Check size={14} />
                    Skapa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingGroup(false);
                      setNewGroupName("");
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Groups list */}
            <div className="space-y-3">
              {allGroups.map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    group.id === household?.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {group.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{group.name}</p>
                          {group.id === household?.id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                              Aktiv
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {group.members.length} {group.members.length === 1 ? "medlem" : "medlemmar"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.id !== household?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectGroup(group.id)}
                        >
                          Välj
                        </Button>
                      )}
                      {group.created_by === profile?.user_id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ta bort grupp</AlertDialogTitle>
                              <AlertDialogDescription>
                                Är du säker på att du vill ta bort "{group.name}"?
                                Alla utgifter, inkomster och avräkningar kopplade till denna grupp kommer att raderas permanent.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteGroup(group.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Ta bort
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Show members for active group */}
                  {group.id === household?.id && (
                    <MemberSettings
                      group={group}
                      profile={profile}
                      {...memberSettingsProps}
                    />
                  )}
                </div>
              ))}
            </div>

            {allGroups.length === 0 && !isCreatingGroup && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground mb-1">Inga grupper ännu</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Skapa en grupp för att börja dela utgifter
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingGroup(true)}
                  className="gap-2"
                >
                  <Plus size={14} />
                  Skapa din första grupp
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
