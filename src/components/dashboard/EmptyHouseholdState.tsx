import { Home } from "lucide-react";

interface EmptyHouseholdStateProps {
  sidebarWidth: string;
}

export const EmptyHouseholdState = ({ sidebarWidth }: EmptyHouseholdStateProps) => {
  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Home className="h-12 w-12 text-muted-foreground/40 animate-pulse-soft" />
          </div>
          <h1 className="text-xl font-medium text-foreground mb-1">Välkommen!</h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Ditt hushåll skapas automatiskt. Vänta ett ögonblick...
          </p>
        </div>
      </main>
    </div>
  );
};
