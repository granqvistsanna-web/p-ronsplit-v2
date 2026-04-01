import { useState } from "react";
import { AddFab } from "@/components/AddFab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGroups } from "@/hooks/useGroups";
import { GroupSelector } from "@/components/GroupSelector";
import { useSavingsProjects, ProjectWithStats, SavingsContribution } from "@/hooks/useSavingsProjects";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { PiggyBank, Plus, Home } from "lucide-react";
import { AddProjectModal } from "@/components/AddProjectModal";
import { AddContributionModal } from "@/components/AddContributionModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { SavingsProjectCard } from "@/components/SavingsProjectCard";

const Sparande = () => {
  const { user } = useAuth();
  const { household, allGroups, loading: householdLoading, selectGroup } = useGroups();
  const { sidebarWidth } = useSidebar();

  const {
    projects,
    loading: projectsLoading,
    addProject,
    updateProject,
    deleteProject,
    addContribution,
    updateContribution,
    deleteContribution,
    getContributionsForProject,
  } = useSavingsProjects(household?.id);

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isAddContributionModalOpen, setIsAddContributionModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);

  const loading = householdLoading || projectsLoading;

  const handleAddProject = async (project: {
    name: string;
    description?: string;
    target_amount: number;
  }) => {
    if (!household?.id) return;
    await addProject({
      group_id: household.id,
      name: project.name,
      description: project.description,
      target_amount: project.target_amount,
    });
    setIsAddProjectModalOpen(false);
  };

  const handleAddContribution = async (contribution: {
    user_id: string;
    amount: number;
    date: string;
    note?: string;
  }) => {
    if (!selectedProject) return;
    await addContribution({
      project_id: selectedProject.id,
      user_id: contribution.user_id,
      amount: contribution.amount,
      date: contribution.date,
      note: contribution.note,
    });
    setIsAddContributionModalOpen(false);
  };

  const handleEditProject = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setIsEditProjectModalOpen(true);
  };

  const handleOpenAddContribution = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setIsAddContributionModalOpen(true);
  };

  const handleUpdateProject = async (updates: {
    name?: string;
    description?: string;
    target_amount?: number;
  }) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, updates);
    setIsEditProjectModalOpen(false);
    setSelectedProject(null);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    await deleteProject(selectedProject.id);
    setIsEditProjectModalOpen(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2">
              <div className="h-8 w-32 rounded-md skeleton-shimmer" />
              <div className="h-10 w-48 rounded-md skeleton-shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 w-3/4 rounded-md skeleton-shimmer mb-4" />
                  <div className="h-4 w-full rounded-md skeleton-shimmer mb-2" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="h-4 w-2/3 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 150}ms` }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!household) {
    return (
      <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
        <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="rounded-full bg-muted p-5 mb-4">
                <Home size={24} className="text-muted-foreground/40" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">Inget hushåll valt</p>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                Välj ett hushåll för att se dina sparprojekt
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth} transition-all duration-300`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-heading text-xl sm:text-2xl">Sparande</h1>
            <GroupSelector
              groups={allGroups}
              selectedGroupId={household?.id}
              onSelectGroup={selectGroup}
            />
          </div>
        </div>

        {/* Content */}
        {projects.length === 0 ? (
          // Empty State
          <Card className="border-dashed border-2 bg-muted/20 animate-fade-in" style={{ animationDelay: '40ms' }}>
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="rounded-full bg-muted p-5 mb-4">
                <PiggyBank size={24} className="text-muted-foreground/40" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">Inga sparprojekt ännu</p>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                Skapa ett sparprojekt som "Barnsparande" eller "Semesterkassa" och börja spara tillsammans
              </p>
              <Button onClick={() => setIsAddProjectModalOpen(true)} className="gap-2">
                <Plus size={20} />
                Skapa sparprojekt
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Projects Grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '40ms' }}>
            {projects.map((project, index) => (
              <SavingsProjectCard
                key={project.id}
                project={project}
                contributions={getContributionsForProject(project.id)}
                onEdit={() => handleEditProject(project)}
                onAddContribution={() => handleOpenAddContribution(project)}
                onDeleteContribution={deleteContribution}
                onUpdateContribution={updateContribution}
                style={{ animationDelay: `${60 + index * 20}ms` }}
              />
            ))}
          </div>
        )}

        {/* Add FAB (always visible) */}
        <AddFab onClick={() => setIsAddProjectModalOpen(true)} />

        {/* Modals */}
        <AddProjectModal
          isOpen={isAddProjectModalOpen}
          onClose={() => setIsAddProjectModalOpen(false)}
          onAdd={handleAddProject}
        />

        <AddContributionModal
          isOpen={isAddContributionModalOpen}
          onClose={() => setIsAddContributionModalOpen(false)}
          onAdd={handleAddContribution}
          groupId={household?.id}
          projectName={selectedProject?.name || ""}
        />

        <EditProjectModal
          isOpen={isEditProjectModalOpen}
          onClose={() => {
            setIsEditProjectModalOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          contributions={selectedProject ? getContributionsForProject(selectedProject.id) : []}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
        />
      </main>
    </div>
  );
};

export default Sparande;
