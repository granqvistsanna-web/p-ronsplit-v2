import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMembersModal } from "@/components/AddMembersModal";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useTheme } from "@/hooks/useTheme";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Tag, LogOut, Trash2, ChevronLeft, Users, Plus, Palette, Sun, Moon, Monitor, Edit2, Check, X, Calendar } from "lucide-react";
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
const Settings = () => {
  const navigate = useNavigate();
  const { profile, signOut, updatePassword, updateProfile } = useAuth();
  const { household, allGroups, loading: householdLoading, updateHouseholdName, addMembers, createGroup, deleteGroup, selectGroup } = useGroups();
  const { theme, setTheme } = useTheme();
  const { selectedYear, selectedMonth, goToCurrentMonth, isCurrentMonth } = useMonthSelection();

  const [newName, setNewName] = useState("");
  const [isChangingName, setIsChangingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [editingHouseholdName, setEditingHouseholdName] = useState("");
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newName.trim().length < 2) {
      toast.error("Namn måste vara minst 2 tecken");
      return;
    }

    setIsChangingName(true);

    try {
      const { error } = await updateProfile(newName.trim());
      if (error) {
        toast.error("Kunde inte uppdatera namn");
      } else {
        toast.success("Namn uppdaterat");
        setNewName("");
      }
    } finally {
      setIsChangingName(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Lösenord måste vara minst 6 tecken");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error("Kunde inte byta lösenord");
      } else {
        toast.success("Lösenord uppdaterat");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      if (profile) {
        const { error: deleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("user_id", profile.user_id);

        if (deleteError) {
          toast.error("Kunde inte radera kontot");
          setIsDeletingAccount(false);
          return;
        }
      }

      await signOut();
      toast.success("Konto raderat");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Kunde inte radera kontot");
      navigate("/auth");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Kunde inte logga ut");
      navigate("/auth");
    }
  };

  const handleEditHouseholdName = () => {
    if (household) {
      setEditingHouseholdName(household.name);
      setIsEditingHouseholdName(true);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (editingHouseholdName.trim().length < 2) {
      toast.error("Hushållsnamn måste vara minst 2 tecken");
      return;
    }

    await updateHouseholdName(editingHouseholdName.trim());
    setIsEditingHouseholdName(false);
    setEditingHouseholdName("");
  };

  const handleCancelEditHouseholdName = () => {
    setIsEditingHouseholdName(false);
    setEditingHouseholdName("");
  };

  const handleAddMembers = async (userIds: string[]) => {
    await addMembers(userIds);
    setIsAddMembersModalOpen(false);
  };

  const handleCreateGroup = async () => {
    if (newGroupName.trim().length < 2) {
      toast.error("Gruppnamn måste vara minst 2 tecken");
      return;
    }

    const result = await createGroup(newGroupName.trim());
    if (result) {
      setNewGroupName("");
      setIsCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId);
  };

  return (
    <div className="pt-14 lg:pt-0 lg:pl-64">
      <main className="container max-w-3xl py-8 sm:py-12 px-4 sm:px-6 pb-6 lg:pb-8 mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Inställningar</h1>
        </div>

        <div className="space-y-6">
          {/* Groups Card */}
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
              {householdLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
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
                              handleCreateGroup();
                            } else if (e.key === "Escape") {
                              setIsCreatingGroup(false);
                              setNewGroupName("");
                            }
                          }}
                        />
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleCreateGroup}
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
                                onClick={() => selectGroup(group.id)}
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
                                      onClick={() => handleDeleteGroup(group.id)}
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
                          <div className="pt-3 border-t border-border/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Medlemmar
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleEditHouseholdName}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Edit2 size={12} />
                                  Ändra namn
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsAddMembersModalOpen(true)}
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
                                      handleSaveHouseholdName();
                                    } else if (e.key === "Escape") {
                                      handleCancelEditHouseholdName();
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSaveHouseholdName}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check size={14} className="text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEditHouseholdName}
                                  className="h-8 w-8 p-0"
                                >
                                  <X size={14} className="text-red-600" />
                                </Button>
                              </div>
                            )}

                            <div className="space-y-2">
                              {group.members.map((member) => (
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
                                      {member.user_id === profile?.user_id ? "Du" : "Medlem"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {allGroups.length === 0 && !isCreatingGroup && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">Inga grupper ännu</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreatingGroup(true)}
                        className="mt-3 gap-2"
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

          {/* Theme Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Utseende</CardTitle>
              </div>
              <CardDescription>Anpassa appens utseende och tema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Välj tema</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-col h-auto py-4 gap-2 transition-all",
                      theme === "light" && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-sm font-medium">Ljust</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex-col h-auto py-4 gap-2 transition-all",
                      theme === "dark" && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-sm font-medium">Mörkt</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex-col h-auto py-4 gap-2 transition-all",
                      theme === "system" && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-sm font-medium">System</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Systemläget matchar ditt operativsystems inställningar
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Month Selection Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Månadsvisning</CardTitle>
              </div>
              <CardDescription>Hantera månadsval och tidsperioder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background">
                  <div>
                    <p className="text-sm font-medium text-foreground">Aktuell visad månad</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('sv-SE', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {!isCurrentMonth && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        goToCurrentMonth();
                        toast.success("Återställd till aktuell månad");
                      }}
                    >
                      Återställ
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Du kan bläddra mellan månader på hemsidan med månadsväljaren.
                    Appen visar alltid data för den valda månaden.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Historisk data finns tillgänglig för alla tidigare månader.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Profil</CardTitle>
              </div>
              <CardDescription>Din personliga information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile && (
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xl sm:text-2xl font-semibold text-primary">
                    {profile.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-foreground truncate">{profile.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <form onSubmit={handleNameChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newName" className="text-sm font-medium">
                      Ändra namn
                    </Label>
                    <Input
                      id="newName"
                      type="text"
                      placeholder={profile?.name || "Ditt namn"}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Button type="submit" disabled={isChangingName} className="w-full sm:w-auto">
                    {isChangingName ? "Sparar..." : "Uppdatera namn"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Säkerhet</CardTitle>
              </div>
              <CardDescription>Hantera ditt lösenord</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    Nytt lösenord
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Bekräfta lösenord
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                  {isChangingPassword ? "Sparar..." : "Uppdatera lösenord"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Categories Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Kategorier</CardTitle>
              </div>
              <CardDescription>Tillgängliga utgiftskategorier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-sm"
                  >
                    <span>{category.icon}</span>
                    <span className="text-foreground font-medium">{category.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Konto</CardTitle>
              </div>
              <CardDescription>Logga ut från ditt konto</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Riskzon</CardTitle>
              </div>
              <CardDescription>Permanenta åtgärder som inte kan ångras</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Radera konto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border border-border mx-4 max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Radera konto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Detta raderar permanent ditt konto och all data. Denna åtgärd kan inte ångras.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="border-border m-0 w-full sm:w-auto">
                      Avbryt
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 m-0 w-full sm:w-auto"
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? "Raderar..." : "Radera permanent"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* About */}
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Päronsplit · v1.0
            </p>
          </div>
        </div>
      </main>

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        onSubmit={handleAddMembers}
        currentMembers={household?.members || []}
      />
    </div>
  );
};

export default Settings;
