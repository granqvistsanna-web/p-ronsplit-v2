import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import logo from "@/assets/logo.png";

const emailSchema = z.string().email("Ogiltig e-postadress");
const passwordSchema = z
  .string()
  .min(8, "Lösenord måste vara minst 8 tecken")
  .regex(/[A-Z]/, "Lösenord måste innehålla minst en stor bokstav")
  .regex(/[a-z]/, "Lösenord måste innehålla minst en liten bokstav")
  .regex(/[0-9]/, "Lösenord måste innehålla minst en siffra");
const nameSchema = z.string().min(2, "Namn måste vara minst 2 tecken");

type AuthMode = "login" | "signup" | "forgot-password";

interface RateLimitState {
  attempts: number;
  lastAttemptTime: number;
  blockedUntil: number | null;
}

const RATE_LIMIT_KEY = "auth_rate_limit";
const MAX_ATTEMPTS = 5;
const INITIAL_DELAY = 1000;
const MAX_DELAY = 60000;

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    const checkRateLimit = () => {
      const now = Date.now();
      const stored = localStorage.getItem(RATE_LIMIT_KEY);

      if (stored) {
        const state: RateLimitState = JSON.parse(stored);

        if (state.blockedUntil && state.blockedUntil > now) {
          setRateLimitedUntil(state.blockedUntil);
        } else if (state.blockedUntil && state.blockedUntil <= now) {
          localStorage.removeItem(RATE_LIMIT_KEY);
          setRateLimitedUntil(null);
        }
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user && !loading) {
      localStorage.removeItem(RATE_LIMIT_KEY);
      setRateLimitedUntil(null);
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const getRateLimitState = (): RateLimitState => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { attempts: 0, lastAttemptTime: 0, blockedUntil: null };
  };

  const recordFailedAttempt = () => {
    const now = Date.now();
    const state = getRateLimitState();
    const newAttempts = state.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      const delayMultiplier = Math.pow(2, newAttempts - MAX_ATTEMPTS);
      const delay = Math.min(INITIAL_DELAY * delayMultiplier, MAX_DELAY);
      const blockedUntil = now + delay;

      const newState: RateLimitState = {
        attempts: newAttempts,
        lastAttemptTime: now,
        blockedUntil,
      };

      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newState));
      setRateLimitedUntil(blockedUntil);

      const seconds = Math.ceil(delay / 1000);
      toast.error(`För många misslyckade försök. Vänta ${seconds} sekunder.`);
    } else {
      const newState: RateLimitState = {
        attempts: newAttempts,
        lastAttemptTime: now,
        blockedUntil: null,
      };

      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newState));

      if (newAttempts >= 3) {
        toast.warning(`Varning: ${MAX_ATTEMPTS - newAttempts} försök kvar innan tillfällig spärr.`);
      }
    }
  };

  const isRateLimited = (): boolean => {
    if (rateLimitedUntil && rateLimitedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      toast.error(`Vänta ${remainingSeconds} sekunder innan du försöker igen.`);
      return true;
    }
    return false;
  };

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    // Only validate password for login and signup modes
    if (mode !== "forgot-password") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    if (mode === "signup") {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field: "email" | "password" | "name") => {
    if (!touched[field]) return;
    
    const newErrors = { ...errors };
    
    if (field === "email") {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      } else {
        delete newErrors.email;
      }
    }
    
    if (field === "password" && mode !== "forgot-password") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      } else {
        delete newErrors.password;
      }
    }
    
    if (field === "name" && mode === "signup") {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      } else {
        delete newErrors.name;
      }
    }
    
    setErrors(newErrors);
  };

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsSubmitting(true);
    try {
      // Always show the same message regardless of whether the email exists
      // to prevent account enumeration attacks
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setResetEmailSent(true);
      toast.success("Om e-postadressen finns i vårt system skickas ett återställningsmail.");
    } catch (error) {
      // Still show success message to prevent account enumeration
      setResetEmailSent(true);
      toast.success("Om e-postadressen finns i vårt system skickas ett återställningsmail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error("Google-inloggning misslyckades. Försök igen.");
        console.error("Google sign-in error:", error);
      }
    } catch (error) {
      toast.error("Ett oväntat fel uppstod. Försök igen.");
      console.error("Google sign-in error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot-password") {
      await handleForgotPassword();
      return;
    }

    if (isRateLimited()) {
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          recordFailedAttempt();
          toast.error("Inloggningen misslyckades. Kontrollera dina uppgifter och försök igen.");
        } else {
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          // Generic message to prevent account enumeration
          toast.error("Inloggningen misslyckades. Kontrollera dina uppgifter och försök igen.");
        } else {
          toast.success("Verifieringslänk skickad till din e-post");
          navigate("/verify-email");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setTouched({});
    setResetEmailSent(false);
    if (newMode === "forgot-password") {
      // Keep email when switching to forgot-password
      setPassword("");
      setName("");
    } else {
      setEmail("");
      setPassword("");
      setName("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Laddar...</p>
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

      {/* Auth form - centered */}
      <div className="flex items-center justify-center px-4 py-12 sm:py-16 min-h-[calc(100vh-73px)]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          {/* Alternative: Minimal back link */}
          <button
            onClick={() => mode === "forgot-password" ? switchMode("login") : navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 sm:mb-12 -mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {mode === "forgot-password" ? "Tillbaka till inloggning" : "Tillbaka"}
          </button>

          {/* Heading */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-heading text-2xl sm:text-3xl mb-2">
              {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Glömt lösenord"}
            </h2>
            {mode === "signup" && (
              <p className="text-sm text-muted-foreground">
                Börja dela utgifter rättvist
              </p>
            )}
            {mode === "forgot-password" && (
              <p className="text-sm text-muted-foreground">
                {resetEmailSent 
                  ? "Kolla din e-post för återställningslänken"
                  : "Ange din e-postadress så skickar vi en återställningslänk"}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="name" className="text-sm text-foreground">
                    Namn
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ditt namn"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setTouched({ ...touched, name: true });
                    }}
                    onBlur={() => {
                      setTouched({ ...touched, name: true });
                      validateField("name");
                    }}
                    autoComplete="name"
                    className={`h-12 text-base ${
                      touched.name && errors.name
                        ? "border-destructive"
                        : ""
                    }`}
                  />
                  {errors.name && touched.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">
                E-postadress
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="erik@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setTouched({ ...touched, email: true });
                }}
                onBlur={() => {
                  setTouched({ ...touched, email: true });
                  validateField("email");
                }}
                autoComplete="email"
                className={`h-12 text-base ${
                  touched.email && errors.email
                    ? "border-destructive"
                    : ""
                }`}
              />
              {errors.email && touched.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {mode !== "forgot-password" && (
                <motion.div
                  key="password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="password" className="text-sm text-foreground">
                    Lösenord
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "login" ? "Ditt lösenord" : "Minst 8 tecken"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setTouched({ ...touched, password: true });
                      }}
                      onBlur={() => {
                        setTouched({ ...touched, password: true });
                        validateField("password");
                      }}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className={`h-12 text-base pr-12 ${
                        touched.password && errors.password
                          ? "border-destructive"
                          : ""
                      }`}
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
                  {mode === "signup" && (
                    <PasswordStrengthIndicator password={password} show={!!password} />
                  )}
                  {errors.password && touched.password && (
                    <p className="text-xs text-destructive mt-1">{errors.password}</p>
                  )}
                  
                  {/* Forgot password link - only show in login mode */}
                  {mode === "login" && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => switchMode("forgot-password")}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Glömt lösenord?
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full h-12 text-base font-normal mt-8"
              disabled={isSubmitting || (rateLimitedUntil !== null && rateLimitedUntil > Date.now()) || (mode === "forgot-password" && resetEmailSent)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Loggar in..." : mode === "signup" ? "Skapar konto..." : "Skickar..."}
                </>
              ) : rateLimitedUntil && rateLimitedUntil > Date.now() ? (
                `Vänta ${Math.ceil((rateLimitedUntil - Date.now()) / 1000)}s`
              ) : mode === "forgot-password" && resetEmailSent ? (
                "E-post skickad"
              ) : (
                mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka återställningslänk"
              )}
            </Button>

          </form>

          {/* Mode toggle - minimal, secondary */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-center text-muted-foreground">
              {mode === "login" ? "Inget konto?" : mode === "signup" ? "Har du redan ett konto?" : "Kom du ihåg lösenordet?"}
              {" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signup" ? "login" : mode === "forgot-password" ? "login" : "signup")}
                className="text-foreground font-normal hover:underline"
              >
                {mode === "login" ? "Skapa konto" : "Logga in"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
