import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DangerZoneProps {
  profile: { email?: string } | null;
  deleteConfirmEmail: string;
  setDeleteConfirmEmail: (email: string) => void;
  isDeletingAccount: boolean;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}

export const DangerZone = ({
  profile,
  deleteConfirmEmail,
  setDeleteConfirmEmail,
  isDeletingAccount,
  onDeleteAccount,
  onSignOut,
}: DangerZoneProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Konto</CardTitle>
          </div>
          <CardDescription>Logga ut från ditt konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={onSignOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logga ut
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Riskzon</CardTitle>
          </div>
          <CardDescription>Permanenta åtgärder som inte kan ångras</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Radera konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border border-border mx-4 max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Radera konto permanent?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>Detta raderar PERMANENT ditt konto och ALL din data:</p>
                  <ul className="list-disc list-inside space-y-1 text-left text-sm">
                    <li>Din profil och kontoinformation</li>
                    <li>Alla utgifter och inkomster du skapat</li>
                    <li>Ditt gruppmedlemskap</li>
                    <li>Din inloggning och autentisering</li>
                  </ul>
                  <p className="font-semibold text-destructive">Denna åtgärd kan INTE ångras.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 my-4">
                <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                  Skriv din e-postadress för att bekräfta:
                </Label>
                <Input
                  id="deleteConfirm"
                  type="email"
                  placeholder={profile?.email || "din@email.com"}
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  className="font-mono"
                />
              </div>

              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel
                  className="border-border m-0 w-full sm:w-auto"
                  onClick={() => setDeleteConfirmEmail("")}
                >
                  Avbryt
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 m-0 w-full sm:w-auto"
                  disabled={isDeletingAccount || deleteConfirmEmail !== profile?.email}
                >
                  {isDeletingAccount ? "Raderar..." : "Radera permanent"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
