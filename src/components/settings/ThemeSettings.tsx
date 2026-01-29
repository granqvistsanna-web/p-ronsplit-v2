import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Sun, Moon, Monitor, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Theme = "light" | "dark" | "system";

export interface ThemeSettingsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectedYear: number;
  selectedMonth: number;
  isCurrentMonth: boolean;
  goToCurrentMonth: () => void;
}

export const ThemeSettings = ({
  theme,
  setTheme,
  selectedYear,
  selectedMonth,
  isCurrentMonth,
  goToCurrentMonth,
}: ThemeSettingsProps) => {
  return (
    <div className="space-y-4">
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
                  theme === "light"
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-70 hover:opacity-100"
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
                  theme === "dark"
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-70 hover:opacity-100"
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
                  theme === "system"
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-70 hover:opacity-100"
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
    </div>
  );
};
