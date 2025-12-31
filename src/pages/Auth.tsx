import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import logo from "@/assets/logo.png";

const emailSchema = z.string().email("Ogiltig e-postadress");
const passwordSchema = z
  .string()
  .min(8, "Lösenord måste vara minst 8 tecken")
  .regex(/[A-Z]/, "Lösenord måste innehålla minst en stor bokstav")
  .regex(/[a-z]/, "Lösenord måste innehålla minst en liten bokstav")
  .regex(/[0-9]/, "Lösenord måste innehålla minst en siffra");
const nameSchema = z.string().min(2, "Namn måste vara minst 2 tecken");

type AuthMode = "login" | "signup";

interface RateLimitState {
  attempts: number;
  lastAttemptTime: number;
  blockedUntil: number | null;
}

const RATE_LIMIT_KEY = "auth_rate_limit";
const MAX_ATTEMPTS = 5;
const INITIAL_DELAY = 1000; // 1 second
const MAX_DELAY = 60000; // 1 minute

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

  // Check rate limit status on mount and periodically
  useEffect(() => {
    const checkRateLimit = () => {
      const now = Date.now();
      const stored = localStorage.getItem(RATE_LIMIT_KEY);

      if (stored) {
        const state: RateLimitState = JSON.parse(stored);

        if (state.blockedUntil && state.blockedUntil > now) {
          setRateLimitedUntil(state.blockedUntil);
        } else if (state.blockedUntil && state.blockedUntil <= now) {
          // Block period expired, reset
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
      // Clear rate limiting on successful auth
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
      // Calculate exponential backoff delay
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
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limiting first
    if (isRateLimited()) {
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          // Record failed login attempt for rate limiting
          recordFailedAttempt();

          // Generic error message to prevent email enumeration
          toast.error("Inloggningen misslyckades. Kontrollera dina uppgifter och försök igen.");
        } else {
          // Success - rate limit cleared in useEffect
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          // Generic error message to prevent email enumeration
          // Don't reveal whether email is already registered
          toast.error("Registreringen misslyckades. Försök igen eller kontakta support.");
        } else {
          toast.success("Verifieringslänk skickad till din e-post");
          navigate("/verify-email");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative z-10 max-w-md text-white">
          <div className="mb-8">
            <img src={logo} alt="Päronsplit" className="h-24 mb-6" />
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Päronsplit</h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Dela utgifter rättvist och enkelt med vänner, familj och partners
            </p>
          </div>
          <div className="space-y-4 text-white/80">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-white">Flexibel fördelning</p>
                <p className="text-sm text-white/70">Anpassa hur utgifter delas mellan gruppmedlemmar</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-white">Automatisk balansering</p>
                <p className="text-sm text-white/70">Se direkt vem som är skyldig vem pengar</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-white">Importera från bank</p>
                <p className="text-sm text-white/70">Ladda upp CSV/Excel-filer för snabb registrering</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={logo} alt="Päronsplit" className="h-20 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Päronsplit</h1>
          </div>

          {/* Auth card */}
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-2xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground">
                {mode === "login" ? "Logga in" : "Skapa konto"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {mode === "login"
                  ? "Välkommen tillbaka till Päronsplit"
                  : "Börja dela utgifter rättvist idag"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Namn
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ditt namn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="h-11"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-postadress
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="erik@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Lösenord
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minst 8 tecken (stor/liten bokstav + siffra)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="h-11 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? "Dölj" : "Visa"}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium mt-6"
                disabled={isSubmitting || (rateLimitedUntil !== null && rateLimitedUntil > Date.now())}
              >
                {isSubmitting
                  ? (mode === "login" ? "Loggar in..." : "Skapar konto...")
                  : rateLimitedUntil && rateLimitedUntil > Date.now()
                  ? `Vänta ${Math.ceil((rateLimitedUntil - Date.now()) / 1000)}s`
                  : (mode === "login" ? "Logga in" : "Skapa konto")}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                {mode === "login" ? "Inget konto?" : "Har du redan ett konto?"}
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setErrors({});
                    setEmail("");
                    setPassword("");
                    setName("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Skapa ett gratis konto" : "Logga in här"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
