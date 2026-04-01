
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

export interface ThemeSettingsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeSettings = ({
  theme,
  setTheme,
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
    </div>
  );
};
