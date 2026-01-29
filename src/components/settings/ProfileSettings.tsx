import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export interface ProfileSettingsProps {
  profile: {
    name?: string;
    email?: string;
  } | null;
  newName: string;
  setNewName: (name: string) => void;
  isChangingName: boolean;
  onNameChange: (e: React.FormEvent) => void;
}

export const ProfileSettings = ({
  profile,
  newName,
  setNewName,
  isChangingName,
  onNameChange,
}: ProfileSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Profil</CardTitle>
        </div>
        <CardDescription>Din personliga information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {profile && (
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
              {profile.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-foreground truncate">{profile.name}</p>
              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <form onSubmit={onNameChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newName" className="text-sm font-medium">
                Ändra namn
              </Label>
              <Input
                id="newName"
                type="text"
                placeholder="Förnamn Efternamn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button type="submit" disabled={isChangingName} className="w-full sm:w-auto">
              {isChangingName ? "Sparar..." : "Uppdatera namn"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
