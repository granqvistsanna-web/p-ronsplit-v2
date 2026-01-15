import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import logo from "@/assets/logo.png";

const passwordSchema = z
  .string()
  .min(8, "Lösenord måste vara minst 8 tecken")
  .regex(/[A-Z]/, "Lösenord måste innehålla minst en stor bokstav")
  .regex(/[a-z]/, "Lösenord måste innehålla minst en liten bokstav")
  .regex(/[0-9]/, "Lösenord måste innehålla minst en siffra");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});

  useEffect(() => {
    // Listen for auth state changes - this catches the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, "Session:", !!session);
      
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the reset link and Supabase created a session
        setIsReady(true);
        setError(null);
      } else if (event === "SIGNED_IN" && session) {
        // Also allow if user is signed in (covers edge cases)
        setIsReady(true);
        setError(null);
      }
    });

    // Check for existing session or URL errors
    const checkInitialState = async () => {
      // Check URL for errors first
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDescription = hashParams.get("error_description");
      
      if (errorDescription) {
        setError(decodeURIComponent(errorDescription));
        return;
      }

      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      }
    };

    checkInitialState();

    return () => subscription.unsubscribe();
  }, []);

  const validate = (): boolean => {
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return false;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message.includes("same as the old")) {
          setError("Det nya lösenordet måste vara annorlunda än det gamla");
        } else {
          setError("Kunde inte uppdatera lösenord. Försök igen.");
        }
        console.error("Password update error:", error);
      } else {
        setIsSuccess(true);
        toast.success("Lösenordet har uppdaterats!");
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error) {
      setError("Ett oväntat fel uppstod. Försök igen.");
      console.error("Password reset error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while waiting for auth event
  if (!isReady && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifierar återställningslänk...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
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

        <div className="flex items-center justify-center px-4 py-12 sm:py-16 min-h-[calc(100vh-73px)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Lösenordet har uppdaterats!</h2>
            <p className="text-muted-foreground mb-4">Du omdirigeras till din dashboard...</p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </motion.div>
        </div>
      </div>
    );
  }

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

      {/* Reset password form - centered */}
      <div className="flex items-center justify-center px-4 py-12 sm:py-16 min-h-[calc(100vh-73px)]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          {/* Heading */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-heading text-2xl sm:text-3xl mb-2">
              Återställ lösenord
            </h2>
            <p className="text-sm text-muted-foreground">
              Ange ditt nya lösenord nedan
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground">
                Nytt lösenord
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minst 8 tecken"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouched({ ...touched, password: true });
                    setError(null);
                  }}
                  autoComplete="new-password"
                  className="h-12 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
                  aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} show={!!password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-foreground">
                Bekräfta lösenord
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Upprepa lösenordet"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setTouched({ ...touched, confirmPassword: true });
                    setError(null);
                  }}
                  autoComplete="new-password"
                  className="h-12 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
                  aria-label={showConfirmPassword ? "Dölj lösenord" : "Visa lösenord"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {touched.confirmPassword && password !== confirmPassword && confirmPassword && (
                <p className="text-xs text-destructive mt-1">Lösenorden matchar inte</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-normal mt-8"
              disabled={isSubmitting || !password || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uppdaterar...
                </>
              ) : (
                "Uppdatera lösenord"
              )}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-center text-muted-foreground">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-foreground font-normal hover:underline"
              >
                Tillbaka till inloggning
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;