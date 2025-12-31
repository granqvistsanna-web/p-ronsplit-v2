import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        toast.error("Kunde inte skicka verifieringslänk");
      } else {
        toast.success("Verifieringslänk skickad till " + user.email);
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      toast.error("Ett fel uppstod");
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCheckVerification = async () => {
    const { data: { user: refreshedUser } } = await supabase.auth.getUser();

    if (refreshedUser?.email_confirmed_at) {
      toast.success("E-post verifierad!");
      navigate("/dashboard");
    } else {
      toast.info("E-posten är inte verifierad ännu. Kolla din inkorg.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Päronsplit" className="h-20 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Päronsplit</h1>
        </div>

        {/* Verification Card */}
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifiera din e-post</CardTitle>
            <CardDescription className="text-base">
              Vi har skickat en verifieringslänk till
            </CardDescription>
            <p className="text-foreground font-medium mt-2">{user?.email}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground font-medium">Nästa steg:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Öppna din e-post</li>
                <li>Klicka på verifieringslänken</li>
                <li>Kom tillbaka hit och klicka "Jag har verifierat"</li>
              </ol>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                className="w-full"
                size="lg"
              >
                Jag har verifierat min e-post
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? "Skickar..." : "Skicka länk igen"}
              </Button>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Hittar du inte e-posten? Kolla i din skräppost.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
