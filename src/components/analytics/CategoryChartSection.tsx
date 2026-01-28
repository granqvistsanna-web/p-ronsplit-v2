import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Users, Loader2 } from "lucide-react";
import { CategoryBarChart } from "./CategoryBarChart";
import { CategoryDrillDown, SelectedCategory } from "./CategoryDrillDown";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useExpenses } from "@/hooks/useExpenses";
import { useGroups } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import { aggregateByCategory } from "@/lib/categoryUtils";

export function CategoryChartSection() {
  const [showAll, setShowAll] = useState(false);
  const [stackedMode, setStackedMode] = useState(false);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);

  const { dateRange, memberIds } = useFilterParams();
  const { household } = useGroups();
  const { user } = useAuth();
  const { expenses, loading } = useExpenses({
    groupId: household?.id || '',
    dateRange,
    memberIds,
  });

  // Handle category click to open drill-down
  const handleCategoryClick = (category: SelectedCategory) => {
    setSelectedCategory(category);
    setDrillDownOpen(true);
  };

  // Handle drill-down close and reset state
  const handleDrillDownClose = (open: boolean) => {
    setDrillDownOpen(open);
    if (!open) {
      // Reset selected category after panel closes (prevents stale data flash)
      setSelectedCategory(null);
    }
  };

  const categoryData = useMemo(
    () => aggregateByCategory(expenses),
    [expenses]
  );

  const hasMore = categoryData.length > 8;
  const members = household?.members || [];

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Utgifter per kategori</h3>

        <div className="flex items-center gap-2">
          <Toggle
            pressed={stackedMode}
            onPressedChange={setStackedMode}
            size="sm"
            aria-label="Visa per medlem"
          >
            <Users className="h-4 w-4 mr-2" />
            Per medlem
          </Toggle>

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Topp 8' : `Alla (${categoryData.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CategoryBarChart
          expenses={expenses}
          members={members}
          showAll={showAll}
          stacked={stackedMode}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {/* Info text */}
      {!showAll && hasMore && !loading && (
        <p className="text-sm text-muted-foreground text-center">
          Visar {Math.min(8, categoryData.length)} av {categoryData.length} kategorier
        </p>
      )}

      {/* Category drill-down panel */}
      <CategoryDrillDown
        open={drillDownOpen}
        onOpenChange={handleDrillDownClose}
        selectedCategory={selectedCategory}
        expenses={expenses}
        members={members}
        currentUserId={user?.id}
      />
    </div>
  );
}
