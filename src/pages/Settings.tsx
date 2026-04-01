import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMembersModal } from "@/components/AddMembersModal";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useTheme } from "@/hooks/useTheme";

import { useSidebar } from "@/hooks/useSidebar";
import { toast } from "sonner";
import { Tag } from "lucide-react";

import {
  ProfileSettings,
  SecuritySettings,
  GroupSettings,
  ThemeSettings,
  DangerZone,
} from "@/components/settings";

const Settings = () => {
  const navigate = useNavigate();
  const { profile, signOut, updatePassword, updateProfile, deleteAccount } = useAuth();
  const { household, allGroups, loading: householdLoading, updateHouseholdName, addMembers, removeMember, createGroup, deleteGroup, selectGroup, joinGroupByCode, updateMonthStartDay } = useGroups();
  const { theme, setTheme } = useTheme();

  const { sidebarWidth } = useSidebar();

  // Profile state
  const [newName, setNewName] = useState("");
  const [isChangingName, setIsChangingName] = useState(false);

  // Security state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account deletion state
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Group management state
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [editingHouseholdName, setEditingHouseholdName] = useState("");
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

  // Profile handlers
  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newName.trim().length < 2) {
      toast.error("Namnet måste vara minst 2 tecken långt");
      return;
    }

    setIsChangingName(true);

    try {
      const { error } = await updateProfile(newName.trim());
      if (error) {
        toast.error("Kunde inte uppdatera namnet. Försök igen eller kontakta support om problemet kvarstår.");
      } else {
        toast.success("Namn uppdaterat");
        setNewName("");
      }
    } finally {
      setIsChangingName(false);
    }
  };

  // Security handlers
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Lösenordet måste vara minst 6 tecken långt");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte. Kontrollera att båda fälten är identiska.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error("Kunde inte uppdatera lösenordet. Försök igen eller kontakta support om problemet kvarstår.");
      } else {
        toast.success("Lösenord uppdaterat");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      const { error } = await deleteAccount();

      if (error) {
        toast.error("Kunde inte radera kontot: " + error.message);
        setIsDeletingAccount(false);
        setDeleteConfirmEmail("");
        return;
      }

      toast.success("Ditt konto har raderats permanent");
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Ett oväntat fel uppstod");
      setIsDeletingAccount(false);
      setDeleteConfirmEmail("");
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Kunde inte logga ut");
      navigate("/auth");
    }
  };

  // Group name editing handlers
  const handleEditHouseholdName = () => {
    if (household) {
      setEditingHouseholdName(household.name);
      setIsEditingHouseholdName(true);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (editingHouseholdName.trim().length < 2) {
      toast.error("Gruppnamnet måste vara minst 2 tecken långt");
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

  // Member handlers
  const handleAddMembers = async (userIds: string[]) => {
    await addMembers(userIds);
    setIsAddMembersModalOpen(false);
  };

  // Group creation handler
  const handleCreateGroup = async () => {
    if (newGroupName.trim().length < 2) {
      toast.error("Gruppnamnet måste vara minst 2 tecken långt");
      return;
    }

    const result = await createGroup(newGroupName.trim());
    if (result) {
      setNewGroupName("");
      setIsCreatingGroup(false);
    }
  };

  // Group deletion handler
  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId);
  };

  // Join group by code handler
  const handleJoinByCode = async () => {
    if (!inviteCodeInput.trim()) {
      toast.error("Ange en inbjudningskod");
      return;
    }
    setIsJoiningGroup(true);
    try {
      const success = await joinGroupByCode(inviteCodeInput);
      if (success) {
        setInviteCodeInput("");
      }
    } finally {
      setIsJoiningGroup(false);
    }
  };

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-3xl py-8 sm:py-12 px-4 sm:px-6 pb-6 lg:pb-8 mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Inställningar</h1>
        </div>

        <div className="space-y-8">
          {/* SECTION 1: Grupper */}
          <section>
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">Grupper</h2>
            <GroupSettings
              household={household}
              allGroups={allGroups}
              loading={householdLoading}
              profile={profile}
              inviteCodeInput={inviteCodeInput}
              setInviteCodeInput={setInviteCodeInput}
              isJoiningGroup={isJoiningGroup}
              onJoinByCode={handleJoinByCode}
              isCreatingGroup={isCreatingGroup}
              setIsCreatingGroup={setIsCreatingGroup}
              newGroupName={newGroupName}
              setNewGroupName={setNewGroupName}
              onCreateGroup={handleCreateGroup}
              onSelectGroup={selectGroup}
              onDeleteGroup={handleDeleteGroup}
              monthStartDay={household?.month_start_day ?? 1}
              onMonthStartDayChange={updateMonthStartDay}
              memberSettingsProps={{
                isEditingHouseholdName,
                editingHouseholdName,
                setEditingHouseholdName,
                onEditHouseholdName: handleEditHouseholdName,
                onSaveHouseholdName: handleSaveHouseholdName,
                onCancelEditHouseholdName: handleCancelEditHouseholdName,
                onOpenAddMembersModal: () => setIsAddMembersModalOpen(true),
                onRemoveMember: removeMember,
              }}
            />
          </section>

          {/* SECTION 2: Utseende */}
          <section>
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">Utseende</h2>
            <ThemeSettings
              theme={theme}
              setTheme={setTheme}
            />
          </section>

          {/* SECTION 3: Konto */}
          <section>
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">Konto</h2>
            <div className="space-y-4">
              <ProfileSettings
                profile={profile}
                newName={newName}
                setNewName={setNewName}
                isChangingName={isChangingName}
                onNameChange={handleNameChange}
              />

              <SecuritySettings
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isChangingPassword={isChangingPassword}
                onPasswordChange={handlePasswordChange}
              />

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
            </div>
          </section>

          {/* SECTION 4: Åtgärder */}
          <section>
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wider text-muted-foreground">Åtgärder</h2>
            <DangerZone
              profile={profile}
              deleteConfirmEmail={deleteConfirmEmail}
              setDeleteConfirmEmail={setDeleteConfirmEmail}
              isDeletingAccount={isDeletingAccount}
              onDeleteAccount={handleDeleteAccount}
              onSignOut={handleSignOut}
            />
          </section>

          {/* Footer */}
          <div className="text-center py-6 border-t border-border/40">
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
