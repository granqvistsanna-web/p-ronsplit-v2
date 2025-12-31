import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  const fetchProfile = useCallback(async (sessionUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      // If no profile exists yet, create one (allowed by RLS: user inserts own profile)
      if (!data) {
        // Safely extract display name from user metadata or email
        const displayName =
          (sessionUser.user_metadata as UserMetadata)?.name ||
          (sessionUser.email ? sessionUser.email.split("@")[0] : null) ||
          "Användare";

        console.log("Creating profile for user:", sessionUser.id, "with name:", displayName);

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: sessionUser.id,
            name: displayName,
            email: sessionUser.email ?? "",
          })
          .select("*")
          .single();

        if (insertError) {
          console.error("Error creating profile:", insertError);

          // If insert failed due to duplicate, try fetching again
          if (insertError.code === '23505') { // Unique violation error code
            console.log("Profile already exists, fetching again...");
            const { data: existingProfile, error: refetchError } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", sessionUser.id)
              .single();

            if (!refetchError && existingProfile) {
              setProfile(existingProfile);
              return;
            }
          }

          // If we still can't get/create the profile, this is a critical error
          console.error("Failed to create or fetch profile after retry");
          return;
        }

        if (inserted) {
          console.log("Profile created successfully:", inserted);
          setProfile(inserted);
        } else {
          console.error("Profile insert succeeded but no data returned");
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Unexpected error in fetchProfile:", error);
    }
  }, []); // No dependencies needed - uses setProfile which is stable

  useEffect(() => {
    let mounted = true;

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
    }).catch((error) => {
      console.error("Error initializing auth session:", error);
      if (mounted) {
        setLoading(false);
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
          // Defer profile fetch to avoid blocking
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user);
            }
          }, 0);
        } else {
          // Clear profile on sign out
          setProfile(null);
        }

        // Only set loading to false on initial load
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    console.log("Attempting signup with email:", email, "redirect:", redirectUrl);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });

    console.log("Signup response:", { data, error });
    
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log("Attempting signin with email:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log("Signin response:", { data, error });
    
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Sign out from Supabase - this will trigger the auth state listener
      // which will automatically clear user, session, and profile
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }

      // Note: We don't manually clear state here because the
      // onAuthStateChange listener will handle it automatically
      // This prevents race conditions and ensures proper state synchronization
    } catch (error) {
      // If signOut fails, manually clear state as fallback
      console.error("Sign out failed, clearing state manually:", error);
      setUser(null);
      setSession(null);
      setProfile(null);
      throw error;
    }
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
  }, [user]);

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
      return { error: new Error("Ingen aktiv session") };
    }

    try {
      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error deleting account:", error);
        return { error: new Error("Kunde inte radera kontot") };
      }

      console.log("Account deletion response:", data);

      // Sign out the user (this will clear local state)
      await signOut();

      return { error: null };
    } catch (error) {
      console.error("Unexpected error deleting account:", error);
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
