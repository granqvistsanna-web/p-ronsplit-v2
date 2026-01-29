import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export interface SecuritySettingsProps {
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  isChangingPassword: boolean;
  onPasswordChange: (e: React.FormEvent) => void;
}

export const SecuritySettings = ({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  onPasswordChange,
}: SecuritySettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Säkerhet</CardTitle>
        </div>
        <CardDescription>Hantera ditt lösenord</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onPasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              Nytt lösenord
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Bekräfta lösenord
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
            {isChangingPassword ? "Sparar..." : "Uppdatera lösenord"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
