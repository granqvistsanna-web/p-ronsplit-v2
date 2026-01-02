import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SavingsContribution } from "@/hooks/useSavingsProjects";
import { useAuth } from "@/hooks/useAuth";
import { PiggyBank, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleDatabaseError } from "@/lib/errorHandling";

interface Member {
  user_id: string;
  name: string;
}

interface SavingsContributionListProps {
  contributions: SavingsContribution[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<SavingsContribution, "amount" | "date" | "note">>) => void;
}

export function SavingsContributionList({
  contributions,
  onDelete,
  onUpdate,
}: SavingsContributionListProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  // Fetch member names
  useEffect(() => {
    const fetchMembers = async () => {
      const userIds = [...new Set(contributions.map((c) => c.user_id))];
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from("users")
        .select("user_id, name")
        .in("user_id", userIds);

      if (error) {
        handleDatabaseError(error, "Kunde inte hämta användarinformation", {
          operation: "fetchMembersForContributions",
          userIds,
        });
        return;
      }

      setMembers(data || []);
    };

    fetchMembers();
  }, [contributions]);

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.name || "Okänd";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (contributions.length === 0) {
    return (
      <div className="text-center py-8 text-caption">
        <p>Inga insättningar ännu</p>
      </div>
    );
  }

  // Sort contributions by date (newest first)
  const sortedContributions = [...contributions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        Insättningar ({contributions.length})
      </h4>
      {sortedContributions.map((contribution) => {
        const canEdit = user?.id === contribution.user_id;

        return (
          <div
            key={contribution.id}
            className="flex items-center gap-3 p-3 hover:bg-secondary/50 rounded-lg transition-colors group"
          >
            <div className="p-1.5 rounded-md bg-savings-bg shrink-0">
              <PiggyBank size={16} className="text-savings" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">
                {getMemberName(contribution.user_id)}
              </p>
              <p className="text-caption text-xs">
                {formatDate(contribution.date)}
                {contribution.note && ` • ${contribution.note}`}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-semibold text-savings text-sm">
                +{contribution.amount.toLocaleString("sv-SE")} kr
              </p>
            </div>

            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(contribution.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
