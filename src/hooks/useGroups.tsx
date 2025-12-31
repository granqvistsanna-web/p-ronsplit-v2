import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface GroupMember {
  id: string;
  user_id: string;
  name: string;
}

interface PublicProfile {
  id: string;
  user_id: string;
  name: string;
}

interface GroupInsert {
  name: string;
  is_temporary: boolean;
}

export interface Group {
  id: string;
  name: string;
  is_temporary: boolean;
  created_by: string;
  created_at: string;
  invite_code: string;
  members: GroupMember[];
}

const SELECTED_GROUP_KEY = "selected_group_id";

export function useGroups() {
  const { user } = useAuth();
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [household, setHousehold] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureHouseholdExists = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if user already has a household
      const { data: memberData } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (memberData?.group_id) {
        return memberData.group_id;
      }

      // Create household if it doesn't exist (fallback for existing users)
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: "Mitt hushåll",
          is_temporary: false,
        } as { name: string; is_temporary: boolean; invite_code: string })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add user as member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupData.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      return groupData.id;
    } catch (error) {
      console.error("Error ensuring household exists:", error);
      return null;
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setAllGroups([]);
      setLoading(false);
      return;
    }

    try {
      // Ensure at least one household exists
      await ensureHouseholdExists();

      // Fetch all group memberships for user
      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;
      
      const groupIds = memberships?.map(m => m.group_id) || [];
      
      if (groupIds.length === 0) {
        setHousehold(null);
        setAllGroups([]);
        setLoading(false);
        return;
      }

      // Fetch all groups the user is a member of
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch all members for all groups
      const { data: allMembersData, error: membersError } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);

      if (membersError) throw membersError;

      // Fetch profiles for all unique user_ids
      const allUserIds = [...new Set(allMembersData?.map(m => m.user_id) || [])];
      let profiles: PublicProfile[] = [];
      
      if (allUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("public_profiles")
          .select("id, user_id, name")
          .in("user_id", allUserIds);
        
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else {
          profiles = profilesData || [];
        }
      }

      // Build groups with members
      const groupsWithMembers: Group[] = (groupsData || []).map(groupData => {
        const groupMembers = (allMembersData || []).filter(m => m.group_id === groupData.id);
        
        const members: GroupMember[] = groupMembers.map((member) => {
          const profile = profiles.find(p => p.user_id === member.user_id);
          return profile
            ? {
                id: profile.id,
                user_id: profile.user_id,
                name: profile.name,
              }
            : {
                id: member.user_id,
                user_id: member.user_id,
                name: "Okänd användare",
              };
        });

        return {
          id: groupData.id,
          name: groupData.name,
          is_temporary: groupData.is_temporary,
          created_by: groupData.created_by,
          created_at: groupData.created_at,
          invite_code: groupData.invite_code,
          members,
        };
      });

      setAllGroups(groupsWithMembers);

      // Determine which group to select
      const savedGroupId = localStorage.getItem(SELECTED_GROUP_KEY);
      let selectedGroup = groupsWithMembers.find(g => g.id === savedGroupId);
      
      // Fallback to first group if saved group not found
      if (!selectedGroup && groupsWithMembers.length > 0) {
        selectedGroup = groupsWithMembers[0];
        localStorage.setItem(SELECTED_GROUP_KEY, selectedGroup.id);
      }

      setHousehold(selectedGroup || null);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Kunde inte hämta grupper");
    } finally {
      setLoading(false);
    }
  }, [user, ensureHouseholdExists]);

  const selectGroup = useCallback((groupId: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (group) {
      setHousehold(group);
      localStorage.setItem(SELECTED_GROUP_KEY, groupId);
    }
  }, [allGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const addMembers = async (userIds: string[]) => {
    if (!household) {
      toast.error("Hushåll finns inte");
      return;
    }

    try {
      const membersToAdd = userIds.map(userId => ({
        group_id: household.id,
        user_id: userId,
      }));

      const { error } = await supabase
        .from("group_members")
        .insert(membersToAdd);

      if (error) {
        console.error("Error adding members:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      await fetchGroups();
      toast.success(`${userIds.length} ${userIds.length === 1 ? 'medlem' : 'medlemmar'} tillagd${userIds.length === 1 ? '' : 'a'}!`);
    } catch (error) {
      console.error("Error adding members:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte lägga till medlemmar";
      toast.error(errorMessage);
    }
  };

  const removeMember = async (userId: string) => {
    if (!household) {
      toast.error("Hushåll finns inte");
      return;
    }

    try {
      const { error } = await supabase.rpc("remove_group_member", {
        group_id_param: household.id,
        user_id_param: userId,
      }) as { data: boolean | null; error: Error | null };

      if (error) {
        console.error("Error removing member:", error);
        throw error;
      }

      await fetchGroups();
      toast.success("Medlem borttagen");
    } catch (error) {
      console.error("Error removing member:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte ta bort medlem";
      toast.error(errorMessage);
    }
  };

  const regenerateInviteCode = async () => {
    if (!household) {
      toast.error("Hushåll finns inte");
      return null;
    }

    try {
      const { data: newCode, error } = await supabase.rpc("regenerate_invite_code", {
        group_id_param: household.id,
      }) as { data: string | null; error: Error | null };

      if (error) {
        console.error("Error regenerating invite code:", error);
        throw error;
      }

      await fetchGroups();
      toast.success("Ny inbjudningskod genererad");
      return newCode;
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte generera ny kod";
      toast.error(errorMessage);
      return null;
    }
  };

  const updateHouseholdName = async (name: string) => {
    if (!household) {
      toast.error("Hushåll finns inte");
      return;
    }

    try {
      const { error } = await supabase
        .from("groups")
        .update({ name })
        .eq("id", household.id);

      if (error) {
        console.error("Error updating household:", error);
        throw error;
      }

      await fetchGroups();
      toast.success("Hushållsnamn uppdaterat");
    } catch (error) {
      console.error("Error updating household:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte uppdatera hushållsnamn";
      toast.error(errorMessage);
    }
  };

  const createGroup = async (name: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return null;
    }

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          is_temporary: false,
        } as { name: string; is_temporary: boolean; invite_code: string })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add user as member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupData.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      await fetchGroups();
      
      // Select the new group
      localStorage.setItem(SELECTED_GROUP_KEY, groupData.id);
      setHousehold({
        ...groupData,
        members: [{
          id: user.id,
          user_id: user.id,
          name: "Du",
        }],
      });

      toast.success("Ny grupp skapad");
      return groupData;
    } catch (error) {
      console.error("Error creating group:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte skapa grupp";
      toast.error(errorMessage);
      return null;
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return false;
    }

    try {
      // Check if user is the creator of the group
      const groupToDelete = allGroups.find(g => g.id === groupId);
      if (!groupToDelete) {
        toast.error("Gruppen finns inte");
        return false;
      }

      if (groupToDelete.created_by !== user.id) {
        toast.error("Endast gruppens skapare kan ta bort den");
        return false;
      }

      // Delete the group (cascade will handle members)
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      // If we deleted the current household, select another one
      if (household?.id === groupId) {
        const remainingGroups = allGroups.filter(g => g.id !== groupId);
        if (remainingGroups.length > 0) {
          localStorage.setItem(SELECTED_GROUP_KEY, remainingGroups[0].id);
          setHousehold(remainingGroups[0]);
        } else {
          localStorage.removeItem(SELECTED_GROUP_KEY);
          setHousehold(null);
        }
      }

      await fetchGroups();
      toast.success("Grupp borttagen");
      return true;
    } catch (error) {
      console.error("Error deleting group:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Kunde inte ta bort grupp";
      toast.error(errorMessage);
      return false;
    }
  };

  return {
    household,
    allGroups,
    loading,
    selectGroup,
    addMembers,
    removeMember,
    regenerateInviteCode,
    updateHouseholdName,
    createGroup,
    deleteGroup,
    refetch: fetchGroups,
  };
}
