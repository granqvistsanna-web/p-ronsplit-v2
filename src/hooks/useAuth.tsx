import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleAuthError, handleDatabaseError, ErrorSeverity, ErrorCategory, handleError } from "@/lib/errorHandling";

interface UserMetadata {
  name?: string;
  [key: string]: unknown;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (name: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const fetchProfile = useCallback(async (sessionUser: User, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", sessionUser.id)
        .maybeSingle();

      if (error) {
        handleDatabaseError(error, "Kunde inte hämta profil", {
          userId: sessionUser.id,
          retryCount
        });
        return;
      }

      // Profile should always exist (created by database trigger)
      // If not found, retry a few times to handle edge cases
      if (!data) {
        if (retryCount < 3) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));

          // Retry fetching the profile
          return fetchProfile(sessionUser, retryCount + 1);
        } else {
          handleError(new Error("Profile not found after 3 retries"), {
            category: ErrorCategory.DATABASE,
            severity: ErrorSeverity.CRITICAL,
            userMessage: "Kunde inte ladda profil. Se SUPABASE_DATABASE_SETUP.md för hjälp.",
            metadata: { userId: sessionUser.id, retries: 3 }
          });
          return;
        }
      }

      setProfile(data);
    } catch (error) {
      handleDatabaseError(error, "Oväntat fel vid hämtning av profil", {
        userId: sessionUser.id
      });
    }
  }, []); // No dependencies needed - uses setProfile which is stable

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.error("Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
      toast.error("Supabase är inte konfigurerat. Lägg till VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    let mounted = true;

    // Timeout fallback to ensure loading doesn't stay true forever
    // If auth initialization takes longer than 5 seconds, force loading to false
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("Auth initialization timeout - setting loading to false");
        setLoading(false);
      }
    }, 5000);

    // Initialize session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setIsEmailVerified(!!session?.user?.email_confirmed_at);

      if (session?.user) {
        fetchProfile(session.user);
      }

      setLoading(false);
      clearTimeout(loadingTimeout);
    }).catch((error) => {
      handleAuthError(error, "Kunde inte initiera sessionen", {
        location: 'auth-initialization'
      });
      if (mounted) {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    // Set up auth state listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsEmailVerified(!!session?.user?.email_confirmed_at);

        // Handle profile based on session
        if (session?.user) {
          // Fetch profile (created automatically by database trigger)
          fetchProfile(session.user);
        } else {
          // Clear profile on sign out
          setProfile(null);
        }

        // Only set loading to false on initial load
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase är inte konfigurerat.");
      return;
    }

    try {
      // Sign out from Supabase - this will trigger the auth state listener
      // which will automatically clear user, session, and profile
      const { error } = await supabase.auth.signOut();

      if (error) {
        handleAuthError(error, "Kunde inte logga ut", {
          location: 'signOut'
        });
        throw error;
      }

      // Note: We don't manually clear state here because the
      // onAuthStateChange listener will handle it automatically
      // This prevents race conditions and ensures proper state synchronization
    } catch (error) {
      // If signOut fails, manually clear state as fallback
      handleError(error, {
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.ERROR,
        userMessage: "Utloggning misslyckades, rensar session",
        metadata: { location: 'signOut-fallback' }
      });
      setUser(null);
      setSession(null);
      setProfile(null);
      throw error;
    }
  }, []);

  // Idle timeout detection - auto logout after 30 minutes of inactivity
  // Use ref to store latest signOut to avoid stale closure
  const signOutRef = useRef(signOut);
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  useEffect(() => {
    if (!user) return; // Only run when user is logged in

    const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    let timeoutId: NodeJS.Timeout;

      const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        toast.info("Du har loggats ut på grund av inaktivitet");
        // Use ref to get latest signOut function, avoiding stale closure
        await signOutRef.current();
      }, IDLE_TIMEOUT);
    };

    // Activity events to monitor
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Start the timer
    resetIdleTimer();

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [user]); // signOut removed from deps since we use ref

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error("Supabase är inte konfigurerat") };
    }

    // Use the current origin for redirect (works for both localhost and production)
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    
    // If there's an error, provide more helpful feedback
    if (error) {
      console.error("Signup error details:", error);
      // Check if it's a redirect URL issue
      if (error.message?.includes("redirect") || error.message?.includes("url")) {
        console.warn("⚠️ Redirect URL might not be configured in Supabase. Add this URL to allowed redirect URLs:", redirectUrl);
      }
    }
    
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error("Supabase är inte konfigurerat") };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error: error as Error | null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { error: error as Error | null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback(async (name: string) => {
    if (!user) {
      return { error: new Error("Ingen användare är inloggad") };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (!error) {
      await refreshProfile();
    }

    return { error: error as Error | null };
  }, [user, refreshProfile]);

  const deleteAccount = useCallback(async () => {
    if (!session?.access_token) {
      const error = new Error("Ingen aktiv session");
      handleAuthError(error, "Ingen aktiv session", {
        location: 'deleteAccount'
      });
      return { error };
    }

    try {
      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        handleAuthError(error, "Kunde inte radera kontot", {
          location: 'deleteAccount-invoke'
        });
        return { error: new Error("Kunde inte radera kontot") };
      }

      // Sign out the user (this will clear local state)
      await signOut();

      return { error: null };
    } catch (error) {
      handleError(error, {
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.ERROR,
        userMessage: "Ett oväntat fel uppstod vid kontoradering",
        metadata: { location: 'deleteAccount-catch' }
      });
      return { error: new Error("Ett oväntat fel uppstod") };
    }
  }, [session, signOut]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    updatePassword,
    updateProfile,
    deleteAccount,
    refreshProfile
  }), [user, session, profile, loading, isEmailVerified, signUp, signIn, signOut, updatePassword, updateProfile, deleteAccount, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
