import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

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
    setIsChecking(true);
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();

      if (refreshedUser?.email_confirmed_at) {
        toast.success("E-post verifierad!");
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } else {
        toast.info("E-posten är inte verifierad ännu. Kolla din inkorg.");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      toast.error("Ett fel uppstod");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
            aria-label="Tillbaka till startsidan"
          >
            <img src={logo} alt="Päronsplit" className="h-8 sm:h-10" />
          </button>
        </div>
      </nav>

      {/* Verify email content - centered */}
      <div className="flex items-center justify-center px-4 py-12 sm:py-16 min-h-[calc(100vh-73px)]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          {/* Alternative: Minimal back link */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 sm:mb-12 -mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </button>

          {/* Heading */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-heading text-2xl sm:text-3xl mb-2">
              Verifiera din e-post
            </h2>
            <p className="text-sm text-muted-foreground">
              Vi har skickat en verifieringslänk till
            </p>
            <p className="text-sm text-foreground font-normal mt-2 break-all">
              {user?.email}
            </p>
          </div>

          {/* Instructions - minimal */}
          <div className="mb-8 pb-8 border-b border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Öppna din e-post och klicka på verifieringslänken. Kom sedan tillbaka hit och klicka på knappen nedan.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              className="w-full h-12 text-base font-normal"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kontrollerar...
                </>
              ) : (
                "Jag har verifierat min e-post"
              )}
            </Button>

            <Button
              onClick={handleResendEmail}
              variant="ghost"
              className="w-full h-12 text-base font-normal"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Skicka länk igen
                </>
              )}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full h-12 text-base font-normal text-muted-foreground hover:text-foreground"
            >
              Logga ut
            </Button>
          </div>

          {/* Help text - minimal, secondary */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Hittar du inte e-posten? Kolla i din skräppost.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmail;
