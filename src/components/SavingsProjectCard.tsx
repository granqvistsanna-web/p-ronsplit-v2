import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectWithStats, SavingsContribution } from "@/hooks/useSavingsProjects";
import { Plus, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { SavingsContributionList } from "@/components/SavingsContributionList";

interface SavingsProjectCardProps {
  project: ProjectWithStats;
  contributions: SavingsContribution[];
  onEdit: () => void;
  onAddContribution: () => void;
  onDeleteContribution: (id: string) => void;
  onUpdateContribution: (id: string, updates: Partial<Pick<SavingsContribution, "amount" | "date" | "note">>) => void;
  style?: React.CSSProperties;
}

export function SavingsProjectCard({
  project,
  contributions,
  onEdit,
  onAddContribution,
  onDeleteContribution,
  onUpdateContribution,
  style,
}: SavingsProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const progressPercentage = (project.current_amount / project.target_amount) * 100;
  const cappedPercentage = Math.min(progressPercentage, 100);
  const isCompleted = progressPercentage >= 100;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card className="animate-fade-in hover:shadow-md transition-shadow" style={style}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground mb-2 truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-caption line-clamp-2">{project.description}</p>
            )}
          </div>
          <Badge variant={isCompleted ? "default" : "secondary"} className="shrink-0">
            {project.target_amount.toLocaleString("sv-SE")} kr
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-caption">
              {project.current_amount.toLocaleString("sv-SE")} kr sparade
            </span>
            <span className="font-medium text-savings">
              {cappedPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-lg overflow-hidden bg-muted">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                isCompleted ? "bg-foreground" : "bg-savings"
              }`}
              style={{ width: `${cappedPercentage}%` }}
            />
          </div>
          {progressPercentage > 100 && (
            <p className="text-xs text-muted-foreground text-center">
              +{(project.current_amount - project.target_amount).toLocaleString("sv-SE")} kr över målet!
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm pt-4 border-t">
          <div className="flex items-center gap-4">
            <span className="text-caption">
              {project.contribution_count} {project.contribution_count === 1 ? "insättning" : "insättningar"}
            </span>
            {project.last_contribution_date && (
              <span className="text-caption">
                Senast: {formatDate(project.last_contribution_date)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4">
          <Button
            size="sm"
            onClick={onAddContribution}
            className="gap-2 flex-1"
          >
            <Plus size={16} />
            Insättning
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onEdit}
            className="gap-2 flex-1"
          >
            <Edit size={16} />
            Redigera
          </Button>
          {contributions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          )}
        </div>

        {/* Expandable Contributions List */}
        {isExpanded && contributions.length > 0 && (
          <div className="pt-4 border-t animate-slide-up">
            <SavingsContributionList
              contributions={contributions}
              onDelete={onDeleteContribution}
              onUpdate={onUpdateContribution}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
