import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TransactionList } from "./TransactionList";
import type { Expense, GroupMember } from "@/lib/types";

/**
 * Selected category information for drill-down panel
 */
export interface SelectedCategory {
  id: string;
  name: string;
  icon: string;
}

interface CategoryDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: SelectedCategory | null;
  expenses: Expense[];
  members: GroupMember[];
  onEdit?: (expense: Expense) => void;
  currentUserId?: string;
}

/**
 * Responsive drill-down panel for category transactions.
 * Renders Sheet on desktop (>=768px), Drawer on mobile (<768px).
 */
export function CategoryDrillDown({
  open,
  onOpenChange,
  selectedCategory,
  expenses,
  members,
  onEdit,
  currentUserId,
}: CategoryDrillDownProps) {
  const isMobile = useIsMobile();

  // Handle null selectedCategory gracefully
  if (!selectedCategory) {
    return null;
  }

  // Shared header content
  const headerContent = (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{selectedCategory.icon}</span>
      <span className="text-lg font-semibold">{selectedCategory.name}</span>
    </div>
  );

  // Shared body content
  const bodyContent = (
    <TransactionList
      expenses={expenses}
      categoryId={selectedCategory.id}
      members={members}
      onEdit={onEdit}
      currentUserId={currentUserId}
    />
  );

  // Mobile: Drawer with swipe-to-dismiss
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle asChild>{headerContent}</DrawerTitle>
            <DrawerClose className="rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Stäng</span>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{bodyContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Sheet side panel
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col [&>button]:min-h-[44px] [&>button]:min-w-[44px]"
      >
        <SheetHeader>
          <SheetTitle asChild>{headerContent}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4">{bodyContent}</div>
      </SheetContent>
    </Sheet>
  );
}
