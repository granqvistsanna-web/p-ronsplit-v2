# Authentication Security Fixes - Implementation Plan
**Date:** 2025-12-31
**Project:** Päronsplit
**Scope:** Top 3 Critical/High Priority Security Issues

---

## 🎯 Overview

This document provides a step-by-step implementation plan to fix the top 3 security issues identified in the Authentication QA Report:

1. **Issue #1:** Hardcoded Supabase Credentials (CRITICAL)
2. **Issue #2:** Incomplete Account Deletion (HIGH)
3. **Issue #3:** No Email Verification Enforcement (HIGH)

**Estimated Total Time:** 6-8 hours
**Recommended Order:** #1 → #3 → #2 (based on dependencies and risk)

---

## 📋 Pre-Implementation Checklist

- [ ] Backup current database
- [ ] Create feature branch: `git checkout -b fix/auth-security-issues`
- [ ] Ensure Supabase dashboard access
- [ ] Review current .env.example file
- [ ] Verify local development environment is working
- [ ] Create test user accounts for testing

---

## 🔴 Issue #1: Hardcoded Supabase Credentials

**Severity:** CRITICAL
**Estimated Time:** 30 minutes
**Risk Level:** Low (configuration change)
**Dependencies:** None

### Current State
```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = "https://qswvgfslsginwpqkbbki.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qNBQuKmlL4PNtwTnyn6wDQ__JdeVZGN";
```

### Implementation Steps

#### Step 1.1: Update Supabase Client (5 min)
**File:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### Step 1.2: Update .env.example (2 min)
**File:** `.env.example`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qswvgfslsginwpqkbbki.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_qNBQuKmlL4PNtwTnyn6wDQ__JdeVZGN
```

#### Step 1.3: Create .env File (2 min)
**File:** `.env` (create new file)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qswvgfslsginwpqkbbki.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_qNBQuKmlL4PNtwTnyn6wDQ__JdeVZGN
```

**Note:** This file should already be in `.gitignore`

#### Step 1.4: Verify .gitignore (2 min)
**File:** `.gitignore`

Ensure these lines exist:
```
.env
.env.local
.env.*.local
```

#### Step 1.5: Test the Changes (15 min)

```bash
# Install dependencies if needed
npm install

# Start development server
npm run dev
```

**Test Cases:**
- [ ] App starts without errors
- [ ] Can sign up new user
- [ ] Can sign in existing user
- [ ] Can sign out
- [ ] Error thrown if .env is missing (test by renaming .env temporarily)

#### Step 1.6: Update Documentation (4 min)
**File:** `CLAUDE.md`

Add to the "Environment & Deployment" section:
```markdown
### Environment Variables
The application requires the following environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Copy `.env.example` to `.env` and fill in your values:
\`\`\`bash
cp .env.example .env
\`\`\`
```

### Success Criteria
- [x] No hardcoded credentials in source code
- [x] App works with environment variables
- [x] Clear error message if env vars missing
- [x] .env file in .gitignore
- [x] Documentation updated

### Rollback Plan
If issues occur:
```bash
git checkout src/integrations/supabase/client.ts
```

---

## 🟠 Issue #3: No Email Verification Enforcement

**Severity:** HIGH
**Estimated Time:** 2-3 hours
**Risk Level:** Medium (affects user flow)
**Dependencies:** Issue #1 must be completed first

### Current State
Users can access the app immediately after signup without verifying their email.

### Implementation Strategy
We'll implement a multi-step approach:
1. Enable email confirmation in Supabase
2. Update signup flow to show verification message
3. Create email verification page
4. Update protected routes to check verification status
5. Add resend verification email functionality

### Implementation Steps

#### Step 3.1: Configure Supabase Email Settings (10 min)

**In Supabase Dashboard:**
1. Navigate to Authentication → Settings
2. Under "Email Auth" settings:
   - Enable "Enable email confirmations"
   - Set "Confirm email" to ON
3. Under "Email Templates":
   - Customize "Confirm signup" template (optional)
4. Save changes

**Verify redirect URL is set:**
```
https://your-domain.com/auth/callback
```

#### Step 3.2: Create Email Verification Page (30 min)

**File:** `src/pages/VerifyEmail.tsx` (new file)

```typescript
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
```

#### Step 3.3: Update Auth Hook to Check Verification (15 min)

**File:** `src/hooks/useAuth.tsx`

Add a helper to check if email is verified:

```typescript
// Add to AuthContextType interface (line 19)
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean; // ← Add this
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (name: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

// Add after the profile state (around line 39)
const [isEmailVerified, setIsEmailVerified] = useState(false);

// Update the useEffect that monitors auth state (around line 139)
setSession(session);
setUser(session?.user ?? null);
setIsEmailVerified(!!session?.user?.email_confirmed_at); // ← Add this

// Update the value object (around line 262)
const value = useMemo(() => ({
  user,
  session,
  profile,
  loading,
  isEmailVerified, // ← Add this
  signUp,
  signIn,
  signOut,
  updatePassword,
  updateProfile,
  deleteAccount,
  refreshProfile
}), [user, session, profile, loading, isEmailVerified, signUp, signIn, signOut, updatePassword, updateProfile, deleteAccount, refreshProfile]);
```

#### Step 3.4: Update Protected Route (10 min)

**File:** `src/components/ProtectedRoute.tsx`

```typescript
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if email is verified
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
```

#### Step 3.5: Update Auth Page Signup Flow (10 min)

**File:** `src/pages/Auth.tsx`

Update the signup success handling (around line 79-89):

```typescript
} else {
  const { error } = await signUp(email, password, name);
  if (error) {
    if (error.message.includes("already registered")) {
      toast.error("E-postadressen är redan registrerad");
    } else {
      toast.error(error.message);
    }
  } else {
    toast.success("Verifieringslänk skickad till din e-post");
    // Navigate to verify email page instead of dashboard
    navigate("/verify-email");
  }
}
```

#### Step 3.6: Add Route for Verify Email Page (5 min)

**File:** `src/App.tsx`

Import the new page:
```typescript
import VerifyEmail from "./pages/VerifyEmail";
```

Add the route (around line 74, after Auth route):
```typescript
<Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
<Route path="/verify-email" element={<VerifyEmail />} />
<Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
```

#### Step 3.7: Handle Email Confirmation Callback (20 min)

Supabase sends users back after clicking the verification link. We need to handle this.

**Option A:** Auto-redirect (Recommended)
The current setup with `emailRedirectTo: ${window.location.origin}/` will redirect to landing page after verification, then ProtectedRoute will redirect to dashboard.

**Option B:** Create dedicated callback page
**File:** `src/pages/AuthCallback.tsx` (new file)

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Email verification complete, redirect to dashboard
    toast.success("E-post verifierad! Välkommen till Päronsplit.");
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verifierar din e-post...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
```

Add route if using Option B:
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

And update the signup redirect URL in `useAuth.tsx` (line 169):
```typescript
const redirectUrl = `${window.location.origin}/auth/callback`;
```

#### Step 3.8: Update Existing Users (Database Migration)

**Important:** Existing users won't have verified emails. Options:

**Option A:** Auto-verify existing users (Recommended for MVP)
Run this SQL in Supabase SQL Editor:

```sql
-- Auto-verify all existing users created before this feature
UPDATE auth.users
SET email_confirmed_at = created_at
WHERE email_confirmed_at IS NULL
  AND created_at < NOW();
```

**Option B:** Force re-verification
Keep as-is, users will be asked to verify on next login.

### Testing Steps

**Test Case 1: New User Signup**
- [ ] Sign up with new email
- [ ] Should redirect to /verify-email page
- [ ] Should show verification message
- [ ] Check email inbox for verification link
- [ ] Click verification link
- [ ] Should redirect to dashboard (or callback page)
- [ ] Should be able to access all protected routes

**Test Case 2: Resend Verification**
- [ ] From /verify-email page, click "Skicka länk igen"
- [ ] Should receive new email
- [ ] Link should work

**Test Case 3: Unverified User Access**
- [ ] Sign up but don't verify
- [ ] Try to access /dashboard directly
- [ ] Should redirect to /verify-email

**Test Case 4: Existing Users**
- [ ] Existing users should still be able to log in
- [ ] Should not be stuck on verification page

**Test Case 5: Error Handling**
- [ ] Test with invalid email
- [ ] Test resend with network offline
- [ ] Verify error messages are user-friendly

### Success Criteria
- [x] Email verification enforced for new users
- [x] Verification page created with good UX
- [x] Resend functionality works
- [x] Existing users not affected
- [x] All protected routes check verification
- [x] Clear user feedback throughout flow

### Rollback Plan
```bash
# Revert all changes
git checkout src/hooks/useAuth.tsx
git checkout src/components/ProtectedRoute.tsx
git checkout src/pages/Auth.tsx
git checkout src/App.tsx
git rm src/pages/VerifyEmail.tsx
git rm src/pages/AuthCallback.tsx

# In Supabase Dashboard:
# Disable "Enable email confirmations"
```

---

## 🟠 Issue #2: Incomplete Account Deletion

**Severity:** HIGH
**Estimated Time:** 3-4 hours
**Risk Level:** High (data deletion)
**Dependencies:** Issues #1 and #3 should be completed first

### Current State
The "Delete Account" button only deletes the profile, not the actual auth user.

### Implementation Strategy
We'll implement a Supabase Edge Function to handle complete account deletion.

### Implementation Steps

#### Step 2.1: Create Supabase Edge Function (45 min)

**Create function directory:**
```bash
# In Supabase CLI (if available) or dashboard
mkdir -p supabase/functions/delete-user
```

**File:** `supabase/functions/delete-user/index.ts` (new file)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client to get the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    console.log(`Deleting account for user: ${user.id}`)

    // Step 1: Delete user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      // Continue anyway - profile might not exist
    }

    // Step 2: Delete user's group memberships
    const { error: membershipError } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('user_id', user.id)

    if (membershipError) {
      console.error('Error deleting group memberships:', membershipError)
    }

    // Step 3: Delete or anonymize user's expenses/income
    // Option A: Delete everything
    await supabaseAdmin.from('expenses').delete().eq('created_by', user.id)
    await supabaseAdmin.from('income').delete().eq('created_by', user.id)
    await supabaseAdmin.from('settlements').delete().eq('created_by', user.id)

    // Step 4: Delete the auth user (this will cascade to other tables if RLS is set up)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    console.log(`Successfully deleted user: ${user.id}`)

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

#### Step 2.2: Deploy Edge Function (15 min)

**Using Supabase Dashboard:**
1. Go to Supabase Dashboard → Edge Functions
2. Click "New Function"
3. Name: `delete-user`
4. Paste the code from above
5. Deploy

**Or using Supabase CLI:**
```bash
supabase functions deploy delete-user
```

#### Step 2.3: Update useAuth Hook (20 min)

**File:** `src/hooks/useAuth.tsx`

Update the `deleteAccount` function (around line 255):

```typescript
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
```

#### Step 2.4: Update Settings Page with Better UX (30 min)

**File:** `src/pages/Settings.tsx`

Update the delete account handler (around line 101):

```typescript
const handleDeleteAccount = async () => {
  setIsDeletingAccount(true);

  try {
    const { error } = await deleteAccount();

    if (error) {
      toast.error("Kunde inte radera kontot: " + error.message);
      setIsDeletingAccount(false);
      return;
    }

    // Success - user is now signed out
    toast.success("Ditt konto har raderats permanent");
    navigate("/auth");
  } catch (error) {
    console.error("Error deleting account:", error);
    toast.error("Ett oväntat fel uppstod");
    setIsDeletingAccount(false);
  }
};
```

Update the AlertDialog description to be more accurate (around line 706):

```typescript
<AlertDialogDescription>
  Detta raderar PERMANENT ditt konto och ALL din data:
  <ul className="list-disc list-inside mt-2 space-y-1 text-left">
    <li>Din profil och kontoinformation</li>
    <li>Alla utgifter och inkomster du skapat</li>
    <li>Ditt gruppmedlemskap</li>
    <li>Din inloggning och autentisering</li>
  </ul>
  <p className="mt-2 font-semibold">Denna åtgärd kan INTE ångras.</p>
</AlertDialogDescription>
```

#### Step 2.5: Add Confirmation Input (20 min)

For extra safety, require users to type their email to confirm deletion.

**Update Settings.tsx:**

```typescript
// Add state for email confirmation
const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");

// Update AlertDialog content
<AlertDialogContent className="border border-border mx-4 max-w-md">
  <AlertDialogHeader>
    <AlertDialogTitle>Radera konto permanent?</AlertDialogTitle>
    <AlertDialogDescription>
      Detta raderar PERMANENT ditt konto och ALL din data. Denna åtgärd kan INTE ångras.
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
      onClick={handleDeleteAccount}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 m-0 w-full sm:w-auto"
      disabled={isDeletingAccount || deleteConfirmEmail !== profile?.email}
    >
      {isDeletingAccount ? "Raderar..." : "Radera permanent"}
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

#### Step 2.6: Database Cleanup Strategy (30 min)

Decide on data handling strategy:

**Option A: Hard Delete (Recommended for GDPR)**
Delete all user data completely.

**Option B: Soft Delete / Anonymize**
Keep records but anonymize them.

**File:** `supabase/functions/delete-user/index.ts`

For Option B, replace Step 3 with:
```typescript
// Step 3: Anonymize user's data instead of deleting
const anonymousUserId = '00000000-0000-0000-0000-000000000000' // System user

await supabaseAdmin
  .from('expenses')
  .update({
    created_by: anonymousUserId,
    description: '[Deleted User]'
  })
  .eq('created_by', user.id)

// Similar for income and settlements
```

**Recommendation:** Use Option A (hard delete) for GDPR compliance.

#### Step 2.7: Add Audit Logging (20 min)

**File:** `supabase/functions/delete-user/index.ts`

Add logging before deletion:

```typescript
// After validating user, before deletion
const { error: logError } = await supabaseAdmin
  .from('audit_log')
  .insert({
    user_id: user.id,
    action: 'account_deletion',
    metadata: {
      email: user.email,
      deleted_at: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for'),
    }
  })

// Note: You'll need to create the audit_log table first
```

**SQL to create audit_log table:**
```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write to audit log
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### Testing Steps

**Test Case 1: Complete Account Deletion**
- [ ] Create test user account
- [ ] Add some expenses, income, settlements
- [ ] Join a group
- [ ] Go to Settings → Delete Account
- [ ] Should require email confirmation
- [ ] Click delete
- [ ] Verify account is deleted from auth.users
- [ ] Verify profile is deleted
- [ ] Verify group membership removed
- [ ] Verify user data deleted/anonymized
- [ ] Cannot log in with deleted credentials

**Test Case 2: Edge Function Error Handling**
- [ ] Test with invalid token
- [ ] Test with already-deleted user
- [ ] Verify proper error messages

**Test Case 3: Partial Failure Recovery**
- [ ] Test what happens if profile deletes but auth doesn't
- [ ] Verify edge function retries or reports error

**Test Case 4: GDPR Compliance**
- [ ] Verify ALL user data is removed
- [ ] Check all tables for orphaned data
- [ ] Verify no PII remains

### Success Criteria
- [x] Edge function successfully deletes auth user
- [x] All related data properly handled
- [x] Email confirmation required
- [x] Clear warning about permanence
- [x] Proper error handling
- [x] Audit logging in place
- [x] GDPR compliant

### Rollback Plan
```bash
# Revert code changes
git checkout src/hooks/useAuth.tsx
git checkout src/pages/Settings.tsx

# Delete edge function in Supabase Dashboard
# Or via CLI:
supabase functions delete delete-user
```

**Important:** If users have already deleted accounts, you cannot restore them. Test thoroughly before deploying!

---

## 🧪 End-to-End Testing Plan

After implementing all three fixes:

### Complete User Journey Test
1. **New User Signup**
   - [ ] Sign up with new email
   - [ ] Verify redirect to verification page
   - [ ] Check inbox and verify email
   - [ ] Access dashboard successfully

2. **Security Verification**
   - [ ] Verify no hardcoded credentials in code
   - [ ] Check .env file is in .gitignore
   - [ ] Verify environment variables are loaded

3. **Account Deletion**
   - [ ] Create disposable test account
   - [ ] Add test data
   - [ ] Delete account with email confirmation
   - [ ] Verify complete deletion

### Regression Testing
- [ ] Existing users can still log in
- [ ] Password reset still works (if implemented)
- [ ] Profile updates still work
- [ ] Group functionality still works
- [ ] All protected routes accessible after verification

---

## 📦 Deployment Checklist

### Before Deploying to Production

#### Code Changes
- [ ] All code changes committed
- [ ] No console.logs in production code
- [ ] Error messages are user-friendly
- [ ] Loading states implemented

#### Environment Setup
- [ ] .env file NOT committed to git
- [ ] Production .env configured on hosting platform
- [ ] Environment variables tested in staging

#### Supabase Configuration
- [ ] Email confirmation enabled in production
- [ ] Email templates customized
- [ ] Edge function deployed to production
- [ ] Service role key secured
- [ ] Audit log table created (if using)

#### Database
- [ ] Existing users migrated (email_confirmed_at updated)
- [ ] Backup created before migration
- [ ] RLS policies reviewed

#### Testing
- [ ] All test cases passed
- [ ] E2E tests run successfully
- [ ] Performance tested (Edge function response time)
- [ ] Error scenarios tested

#### Documentation
- [ ] README updated with new env vars
- [ ] CLAUDE.md updated
- [ ] Migration notes documented
- [ ] Rollback procedure documented

### Deployment Steps

1. **Merge to main branch**
   ```bash
   git checkout main
   git merge fix/auth-security-issues
   git push origin main
   ```

2. **Deploy edge function first**
   ```bash
   supabase functions deploy delete-user --project-ref YOUR_PROJECT_REF
   ```

3. **Deploy application**
   - Push to hosting platform
   - Verify environment variables are set
   - Monitor deployment logs

4. **Post-deployment verification**
   - [ ] Health check passed
   - [ ] Can sign up new user
   - [ ] Email verification works
   - [ ] Can delete test account
   - [ ] No errors in logs

5. **Monitor for 24 hours**
   - [ ] Watch error rates
   - [ ] Monitor email delivery
   - [ ] Check edge function logs
   - [ ] User feedback/support tickets

---

## 🔄 Rollback Procedures

### If Email Verification Causes Issues

**Immediate Rollback:**
1. Disable email confirmation in Supabase Dashboard
2. Revert ProtectedRoute.tsx:
   ```bash
   git revert <commit-hash>
   ```
3. Deploy immediately

**Data Fix:**
If users are stuck:
```sql
-- Verify all active users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

### If Account Deletion Fails

**Immediate Actions:**
1. Disable delete button in UI:
   ```typescript
   disabled={true} // Emergency disable
   ```
2. Investigate edge function logs
3. Fix and redeploy edge function

**User Impact:**
- Low - users can still use the app
- Affected users: Only those trying to delete accounts

### If Environment Variables Break

**Immediate Fix:**
1. Verify .env file exists in production
2. Check environment variable names match exactly
3. Restart application server
4. If critical, temporarily revert to hardcoded values (NOT RECOMMENDED)

---

## 📊 Success Metrics

Track these metrics after deployment:

### Security Metrics
- **Credential Exposure:** 0 (no hardcoded credentials)
- **Unverified User Signups:** 0%
- **Failed Account Deletions:** <1%

### User Experience Metrics
- **Email Verification Rate:** >90% within 24 hours
- **Support Tickets Related to Auth:** <5% increase
- **Account Deletion Completion:** 100%

### Technical Metrics
- **Edge Function Success Rate:** >99%
- **Edge Function Response Time:** <2 seconds
- **Email Delivery Rate:** >95%

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue: "Missing Supabase environment variables" error**
```bash
# Solution 1: Check .env file exists
ls -la .env

# Solution 2: Verify variable names
cat .env | grep VITE_SUPABASE

# Solution 3: Restart dev server
npm run dev
```

**Issue: Email verification not working**
```typescript
// Check Supabase dashboard:
// Authentication → Settings → Email Auth
// Verify "Enable email confirmations" is ON
```

**Issue: Account deletion fails**
```bash
# Check edge function logs in Supabase Dashboard
# Verify service role key is set correctly
# Check user has valid session token
```

**Issue: Users stuck on verification page**
```sql
-- Manually verify user in database
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

---

## 📞 Escalation Path

If critical issues occur:

1. **Rollback immediately** (see Rollback Procedures)
2. **Notify team** via communication channel
3. **Document the issue** with logs and screenshots
4. **Create hotfix branch** if needed
5. **Test fix thoroughly** before redeploying

---

## ✅ Final Checklist

Before marking this plan complete:

- [ ] All code reviewed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Staging environment tested
- [ ] Production deployment planned
- [ ] Monitoring alerts configured
- [ ] Rollback procedure tested
- [ ] User communication prepared (if needed)

---

**Plan End**

**Estimated Total Implementation Time:** 6-8 hours
**Recommended Timeline:** 2-3 days (allows for testing)
**Team Members Required:** 1 developer + 1 QA tester
