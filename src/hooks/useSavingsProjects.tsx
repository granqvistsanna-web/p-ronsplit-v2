import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { handleDatabaseError, handleAuthError, handleError, ErrorCategory, ErrorSeverity } from "@/lib/errorHandling";
import type { SavingsProject, SavingsContribution } from "@/lib/types";

// Re-export types for backwards compatibility
export type { SavingsProject, SavingsContribution } from "@/lib/types";

export interface ProjectWithStats extends SavingsProject {
  current_amount: number;
  contribution_count: number;
  last_contribution_date: string | null;
}

// Note: This hook requires savings_projects and savings_contributions tables to be created
// See SAVINGS_DATABASE_SETUP.sql for the required schema
export function useSavingsProjects(groupId?: string) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from("savings_projects").select("*");

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data: projectsData, error: projectsError } = await query.order("created_at", {
        ascending: false,
      });

      if (projectsError) {
        // If table doesn't exist, just return empty
        if (projectsError.code === "42P01" || projectsError.message?.includes("does not exist")) {
          console.warn("savings_projects table does not exist yet");
          setProjects([]);
          setContributions([]);
          setLoading(false);
          return;
        }
        throw projectsError;
      }

      // Fetch all contributions for these projects
      const projectIds = projectsData?.map((p) => p.id) || [];
      let contributionsData: SavingsContribution[] = [];

      if (projectIds.length > 0) {
        const { data: contribData, error: contribError } = await supabase
          .from("savings_contributions")
          .select("*")
          .in("project_id", projectIds)
          .order("date", { ascending: false });

        if (contribError && contribError.code !== "42P01") {
          throw contribError;
        }
        contributionsData = (contribData || []) as SavingsContribution[];
      }

      // Calculate stats for each project
      const projectsWithStats: ProjectWithStats[] = (projectsData || []).map((project) => {
        const projectContributions = contributionsData.filter((c) => c.project_id === project.id);
        const current_amount = projectContributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const contribution_count = projectContributions.length;
        const last_contribution_date =
          projectContributions.length > 0 ? projectContributions[0].date : null;

        return {
          id: project.id,
          group_id: project.group_id,
          name: project.name,
          description: project.description,
          target_amount: project.target_amount,
          created_by: project.created_by,
          created_at: project.created_at,
          updated_at: project.updated_at,
          current_amount,
          contribution_count,
          last_contribution_date,
        };
      });

      setProjects(projectsWithStats);
      setContributions(contributionsData);
    } catch (error) {
      handleDatabaseError(error, "Kunde inte hämta sparprojekt", {
        operation: "fetchProjects",
        groupId,
      });
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (project: {
    group_id: string;
    name: string;
    description?: string;
    target_amount: number;
  }) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "addProject",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("savings_projects")
        .insert({
          group_id: project.group_id,
          name: project.name,
          description: project.description || null,
          target_amount: project.target_amount,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      toast.success("Sparprojekt skapat!");
      return data;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte skapa sparprojekt", {
        operation: "addProject",
        projectName: project.name,
      });
      return null;
    }
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<Pick<SavingsProject, "name" | "description" | "target_amount">>
  ) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "updateProject",
      });
      return;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        handleError(new Error("Projektet hittades inte"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Projektet hittades inte",
          metadata: { operation: "updateProject", projectId },
        });
        return;
      }

      // Security check: Verify user created this project
      if (project.created_by !== user.id) {
        handleError(new Error("Du har inte behörighet att uppdatera detta projekt"), {
          category: ErrorCategory.PERMISSION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Du har inte behörighet att uppdatera detta projekt",
          metadata: { operation: "updateProject", projectId },
        });
        return;
      }

      // Verify project belongs to current group if groupId is set
      if (groupId && project.group_id !== groupId) {
        handleError(new Error("Projektet tillhör inte det valda hushållet"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Projektet tillhör inte det valda hushållet",
          metadata: { operation: "updateProject", projectId, groupId },
        });
        return;
      }

      const { error } = await supabase
        .from("savings_projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("created_by", user.id); // Server-side check

      if (error) throw error;

      await fetchProjects();
      toast.success("Projekt uppdaterat!");
    } catch (error) {
      handleDatabaseError(error, "Kunde inte uppdatera projekt", {
        operation: "updateProject",
        projectId,
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "deleteProject",
      });
      return;
    }

    try {
      const projectToDelete = projects.find(p => p.id === projectId);
      if (!projectToDelete) {
        handleError(new Error("Projektet hittades inte"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Projektet hittades inte",
          metadata: { operation: "deleteProject", projectId },
        });
        return;
      }

      // Security check: Verify user created this project
      if (projectToDelete.created_by !== user.id) {
        handleError(new Error("Du har inte behörighet att ta bort detta projekt"), {
          category: ErrorCategory.PERMISSION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Du har inte behörighet att ta bort detta projekt",
          metadata: { operation: "deleteProject", projectId },
        });
        return;
      }

      // Verify project belongs to current group if groupId is set
      if (groupId && projectToDelete.group_id !== groupId) {
        handleError(new Error("Projektet tillhör inte det valda hushållet"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Projektet tillhör inte det valda hushållet",
          metadata: { operation: "deleteProject", projectId, groupId },
        });
        return;
      }

      // Delete from database - contributions will cascade delete
      const { error } = await supabase
        .from("savings_projects")
        .delete()
        .eq("id", projectId)
        .eq("created_by", user.id); // Server-side check

      if (error) throw error;

      await fetchProjects();
      toast.success("Projekt borttaget!");
    } catch (error) {
      handleDatabaseError(error, "Kunde inte ta bort projekt", {
        operation: "deleteProject",
        projectId,
      });
    }
  };

  const addContribution = async (contribution: {
    project_id: string;
    user_id: string;
    amount: number;
    date: string;
    note?: string;
  }) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "addContribution",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("savings_contributions")
        .insert({
          project_id: contribution.project_id,
          user_id: contribution.user_id,
          amount: contribution.amount,
          date: contribution.date,
          note: contribution.note || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      toast.success("Insättning tillagd!");
      return data;
    } catch (error) {
      handleDatabaseError(error, "Kunde inte lägga till insättning", {
        operation: "addContribution",
        projectId: contribution.project_id,
      });
      return null;
    }
  };

  const updateContribution = async (
    contributionId: string,
    updates: Partial<Pick<SavingsContribution, "amount" | "date" | "note">>
  ) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "updateContribution",
      });
      return;
    }

    try {
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) {
        handleError(new Error("Insättningen hittades inte"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Insättningen hittades inte",
          metadata: { operation: "updateContribution", contributionId },
        });
        return;
      }

      // Security check: Verify user created this contribution
      if (contribution.user_id !== user.id) {
        handleError(new Error("Du har inte behörighet att uppdatera denna insättning"), {
          category: ErrorCategory.PERMISSION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Du har inte behörighet att uppdatera denna insättning",
          metadata: { operation: "updateContribution", contributionId },
        });
        return;
      }

      const { error } = await supabase
        .from("savings_contributions")
        .update(updates)
        .eq("id", contributionId)
        .eq("user_id", user.id); // Server-side check

      if (error) throw error;

      await fetchProjects();
      toast.success("Insättning uppdaterad!");
    } catch (error) {
      handleDatabaseError(error, "Kunde inte uppdatera insättning", {
        operation: "updateContribution",
        contributionId,
      });
    }
  };

  const deleteContribution = async (contributionId: string) => {
    if (!user) {
      handleAuthError(new Error("Du måste vara inloggad"), "Du måste vara inloggad", {
        operation: "deleteContribution",
      });
      return;
    }

    try {
      const contributionToDelete = contributions.find(c => c.id === contributionId);
      if (!contributionToDelete) {
        handleError(new Error("Insättningen hittades inte"), {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Insättningen hittades inte",
          metadata: { operation: "deleteContribution", contributionId },
        });
        return;
      }

      // Security check: Verify user created this contribution
      if (contributionToDelete.user_id !== user.id) {
        handleError(new Error("Du har inte behörighet att ta bort denna insättning"), {
          category: ErrorCategory.PERMISSION,
          severity: ErrorSeverity.WARNING,
          userMessage: "Du har inte behörighet att ta bort denna insättning",
          metadata: { operation: "deleteContribution", contributionId },
        });
        return;
      }

      // Delete from database
      const { error } = await supabase
        .from("savings_contributions")
        .delete()
        .eq("id", contributionId)
        .eq("user_id", user.id); // Server-side check

      if (error) throw error;

      await fetchProjects();

      // Show toast with undo action
      toast.success("Insättning borttagen!", {
        duration: 5000,
        action: {
          label: "Ångra",
          onClick: async () => {
            try {
              // Restore the contribution
              const { error: restoreError } = await supabase
                .from("savings_contributions")
                .insert({
                  id: contributionToDelete.id,
                  project_id: contributionToDelete.project_id,
                  user_id: contributionToDelete.user_id,
                  amount: contributionToDelete.amount,
                  date: contributionToDelete.date,
                  note: contributionToDelete.note,
                });

              if (restoreError) throw restoreError;

              await fetchProjects();
              toast.success("Insättning återställd!");
            } catch (restoreError) {
              handleDatabaseError(restoreError, "Kunde inte återställa insättning", {
                operation: "restoreContribution",
                contributionId: contributionToDelete.id,
              });
            }
          },
        },
      });
    } catch (error) {
      handleDatabaseError(error, "Kunde inte ta bort insättning", {
        operation: "deleteContribution",
        contributionId,
      });
    }
  };

  const getContributionsForProject = useCallback(
    (projectId: string) => {
      return contributions.filter(c => c.project_id === projectId);
    },
    [contributions]
  );

  return {
    projects,
    contributions,
    loading,
    addProject,
    updateProject,
    deleteProject,
    addContribution,
    updateContribution,
    deleteContribution,
    getContributionsForProject,
    refetch: fetchProjects,
  };
}
