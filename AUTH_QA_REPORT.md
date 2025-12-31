# Authentication QA Report - Päronsplit
**Date:** 2025-12-31
**Reviewed by:** Claude Code
**Scope:** Complete authentication system review

## Executive Summary

This report documents a comprehensive QA analysis of the Päronsplit authentication system. The review covered authentication flows, security measures, error handling, session management, and code quality.

**Overall Assessment:** ⚠️ **Medium Risk** - Several security issues require immediate attention, particularly around credentials management and account deletion.

### Quick Stats
- **Critical Issues:** 1
- **High Priority Issues:** 4
- **Medium Priority Issues:** 4
- **Low Priority Issues:** 3
- **Positive Findings:** 9

---

## 🔴 Critical Issues

### 1. Hardcoded Supabase Credentials in Source Code
**Location:** `src/integrations/supabase/client.ts:3-4`
**Severity:** CRITICAL

**Issue:**
```typescript
const SUPABASE_URL = "https://qswvgfslsginwpqkbbki.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qNBQuKmlL4PNtwTnyn6wDQ__JdeVZGN";
```

The Supabase URL and key are hardcoded directly in the source code and committed to the repository.

**Risk:**
- Credentials exposed in version control history
- Cannot rotate keys without code changes
- Violates security best practices
- Different environments cannot use different credentials

**Recommendation:**
```typescript
// Use environment variables instead
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Note:** While the key name suggests "publishable" (similar to public API keys), the .env.example file indicates these should be environment variables. The key format is non-standard for Supabase, which typically uses JWT-format anon keys.

---

## 🟠 High Priority Issues

### 2. Incomplete Account Deletion
**Location:** `src/pages/Settings.tsx:101-127`, `src/hooks/useAuth.tsx:255-260`
**Severity:** HIGH

**Issue:**
The `deleteAccount` function only deletes the user's profile from the database but does NOT delete the actual Supabase auth user account.

```typescript
const deleteAccount = useCallback(async () => {
  // First sign out, then the account deletion would need a backend function
  // For now, we'll just sign out - full deletion requires admin API
  await signOut();
  return { error: null };
}, [signOut]);
```

**Risk:**
- User data remains in Supabase auth even after "deletion"
- Violates user expectations and possibly GDPR compliance
- Orphaned auth accounts accumulate over time
- Users cannot truly delete their accounts

**Recommendation:**
Implement a backend edge function or use Supabase's admin API to fully delete the auth user:
1. Create a Supabase Edge Function for account deletion
2. Delete profile data first, then auth user
3. Properly handle errors and cleanup

### 3. No Email Verification Enforcement
**Location:** `src/pages/Auth.tsx:79-89`
**Severity:** HIGH

**Issue:**
After signup, users are immediately redirected to the dashboard without email verification:

```typescript
const { error } = await signUp(email, password, name);
if (error) {
  // handle error
} else {
  toast.success("Konto skapat");
  navigate("/dashboard"); // ← Immediate access without verification
}
```

**Risk:**
- Users can create accounts with fake email addresses
- No way to verify user identity
- Potential for spam/bot accounts
- Cannot communicate with users via email reliably

**Recommendation:**
```typescript
// After signup, check email verification status
const { error } = await signUp(email, password, name);
if (!error) {
  toast.success("Verifieringslänk skickad till din e-post");
  // Don't navigate, show verification pending message
  // Or navigate to a verification pending page
}
```

Also update `ProtectedRoute` to check email verification:
```typescript
if (!user.email_confirmed_at) {
  return <Navigate to="/verify-email" replace />;
}
```

### 4. Race Condition in Profile Creation
**Location:** `src/hooks/useAuth.tsx:41-110`
**Severity:** HIGH

**Issue:**
The profile creation logic has race condition handling (duplicate key check on line 78-90) and uses `setTimeout` to defer profile fetching (line 145), indicating potential timing issues.

```typescript
// Defer profile fetch to avoid blocking
setTimeout(() => {
  if (mounted) {
    fetchProfile(session.user);
  }
}, 0);
```

**Risk:**
- Profile creation might fail intermittently
- Multiple simultaneous profile creation attempts
- Unreliable user onboarding experience
- Edge cases where users have no profile

**Recommendation:**
1. Implement profile creation via database trigger on auth.users insert
2. Or use Supabase's `auth.users` trigger to create profile automatically
3. Remove setTimeout workaround
4. Add proper loading states and retry logic

### 5. No Rate Limiting on Auth Attempts
**Location:** `src/pages/Auth.tsx`
**Severity:** HIGH

**Issue:**
The authentication page has no client-side or visible rate limiting for login/signup attempts.

**Risk:**
- Vulnerable to brute force attacks
- Password enumeration attacks
- Account takeover attempts
- Resource exhaustion

**Recommendation:**
1. Implement Supabase's built-in rate limiting (configure in dashboard)
2. Add client-side throttling for repeated attempts
3. Consider implementing exponential backoff after failed attempts
4. Add CAPTCHA after multiple failed attempts

---

## 🟡 Medium Priority Issues

### 6. Weak Password Policy
**Location:** `src/pages/Auth.tsx:12`
**Severity:** MEDIUM

**Issue:**
```typescript
const passwordSchema = z.string().min(6, "Lösenord måste vara minst 6 tecken");
```

Minimum password length is only 6 characters with no complexity requirements.

**Risk:**
- Weak passwords easily compromised
- Accounts vulnerable to dictionary attacks
- Does not meet modern security standards

**Recommendation:**
```typescript
const passwordSchema = z.string()
  .min(8, "Lösenord måste vara minst 8 tecken")
  .regex(/[A-Z]/, "Lösenord måste innehålla minst en stor bokstav")
  .regex(/[a-z]/, "Lösenord måste innehålla minst en liten bokstav")
  .regex(/[0-9]/, "Lösenord måste innehålla minst en siffra");
```

Or use a password strength library like `zxcvbn`.

### 7. Error Message Information Disclosure
**Location:** `src/pages/Auth.tsx:70-74, 81-84`
**Severity:** MEDIUM

**Issue:**
Error messages reveal whether an email is registered:

```typescript
if (error.message.includes("Invalid login")) {
  toast.error("Fel e-post eller lösenord");
} else {
  toast.error(error.message); // ← May reveal specific errors
}

if (error.message.includes("already registered")) {
  toast.error("E-postadressen är redan registrerad"); // ← Confirms email exists
}
```

**Risk:**
- Email enumeration attacks
- Attackers can determine valid user accounts
- Privacy concerns

**Recommendation:**
Use generic error messages:
```typescript
// For login
toast.error("Inloggningen misslyckades. Kontrollera dina uppgifter.");

// For signup
toast.error("Registreringen misslyckades. Försök igen eller kontakta support.");
```

### 8. Missing Dependency in useCallback
**Location:** `src/hooks/useAuth.tsx:232-236`
**Severity:** MEDIUM

**Issue:**
```typescript
const refreshProfile = useCallback(async () => {
  if (user) {
    await fetchProfile(user);
  }
}, [user]); // ← Missing fetchProfile dependency
```

**Risk:**
- Stale closure over fetchProfile
- Potential bugs if fetchProfile changes
- React Hook warnings

**Recommendation:**
```typescript
const refreshProfile = useCallback(async () => {
  if (user) {
    await fetchProfile(user);
  }
}, [user, fetchProfile]);
```

### 9. No Session Timeout Visible
**Location:** `src/App.tsx:24-48`
**Severity:** MEDIUM

**Issue:**
React Query has a 5-minute stale time for queries, but there's no visible authentication session timeout or idle timeout mechanism.

**Risk:**
- Sessions may persist indefinitely
- Security risk on shared devices
- No automatic logout for inactive users

**Recommendation:**
Implement idle timeout detection:
```typescript
// Add to AuthProvider
useEffect(() => {
  let timeoutId;
  const handleActivity = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      signOut();
      toast.info("Du har loggats ut på grund av inaktivitet");
    }, 30 * 60 * 1000); // 30 minutes
  };

  window.addEventListener('mousedown', handleActivity);
  window.addEventListener('keydown', handleActivity);
  handleActivity();

  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('mousedown', handleActivity);
    window.removeEventListener('keydown', handleActivity);
  };
}, [signOut]);
```

---

## 🔵 Low Priority Issues

### 10. Inconsistent Error Handling
**Location:** Various files
**Severity:** LOW

**Issue:**
- Some errors logged to console only (useAuth.tsx)
- Some shown to users via toast
- No centralized error tracking/monitoring

**Recommendation:**
Implement centralized error tracking (e.g., Sentry) and consistent error handling patterns.

### 11. No Multi-Factor Authentication (MFA)
**Location:** N/A
**Severity:** LOW

**Issue:**
The application doesn't support MFA, which is a best practice for financial applications.

**Recommendation:**
Consider implementing Supabase's MFA features for enhanced security, especially for users managing shared finances.

### 12. Loading State Edge Case
**Location:** `src/hooks/useAuth.tsx:156-158`
**Severity:** LOW

**Issue:**
```typescript
if (event === 'INITIAL_SESSION') {
  setLoading(false);
}
```

Loading is only set to false on `INITIAL_SESSION` event, which might leave `loading=true` in some edge cases.

**Recommendation:**
Add a timeout fallback:
```typescript
// In useEffect
const loadingTimeout = setTimeout(() => {
  if (mounted) {
    setLoading(false);
  }
}, 5000);

return () => {
  clearTimeout(loadingTimeout);
  // ... existing cleanup
};
```

---

## ✅ Positive Findings

The following aspects of the authentication system are well-implemented:

1. **Protected Routes** - Proper implementation with loading states (`ProtectedRoute.tsx:10-25`)
2. **Auth State Subscription** - Proper subscription and cleanup (`useAuth.tsx:135-165`)
3. **Cache Clearing on Logout** - React Query cache properly cleared (`App.tsx:59-64`)
4. **Profile Creation Fallback** - Handles duplicate profile creation gracefully (`useAuth.tsx:78-90`)
5. **Form Validation** - Uses Zod schemas for validation (`Auth.tsx:11-13`)
6. **Password Visibility Toggle** - Good UX feature (`Auth.tsx:224-230`)
7. **Optimized Hooks** - Proper use of useCallback and useMemo (`useAuth.tsx:168-274`)
8. **Subscription Cleanup** - Prevents memory leaks (`useAuth.tsx:162-165`)
9. **Redirect URLs** - Proper email confirmation redirects (`useAuth.tsx:169`)

---

## 🧪 Testing Recommendations

### Manual Testing Checklist
- [ ] Test signup flow with valid email
- [ ] Test signup with duplicate email
- [ ] Test login with correct credentials
- [ ] Test login with incorrect credentials
- [ ] Test password change functionality
- [ ] Test profile name update
- [ ] Test logout functionality
- [ ] Test protected route access when not authenticated
- [ ] Test protected route access when authenticated
- [ ] Test "account deletion" (verify it only signs out)
- [ ] Test browser refresh maintains session
- [ ] Test multiple browser tabs with same account

### Automated Testing Recommendations
Consider adding:
1. Unit tests for auth hook functions
2. Integration tests for auth flows
3. E2E tests for complete user journeys
4. Security tests for authentication bypass attempts

---

## 🛠️ Implementation Priority

### Immediate (This Week)
1. ✅ Move Supabase credentials to environment variables
2. ✅ Implement email verification enforcement
3. ✅ Add proper account deletion or remove the feature

### Short-term (This Month)
4. ✅ Strengthen password policy
5. ✅ Fix race condition in profile creation
6. ✅ Implement rate limiting
7. ✅ Generic error messages to prevent enumeration

### Long-term (Next Quarter)
8. ✅ Add session timeout / idle detection
9. ✅ Implement centralized error tracking
10. ✅ Consider MFA implementation

---

## 📊 Code Metrics

### Files Reviewed
- `src/hooks/useAuth.tsx` (290 lines)
- `src/pages/Auth.tsx` (275 lines)
- `src/pages/Settings.tsx` (748 lines)
- `src/components/ProtectedRoute.tsx` (27 lines)
- `src/components/PublicRoute.tsx` (27 lines)
- `src/integrations/supabase/client.ts` (7 lines)
- `src/App.tsx` (103 lines)

### Security Scan Summary
- **Authentication flows:** 3 (signup, login, logout)
- **Protected routes:** 4 (dashboard, analys, aktivitet, settings)
- **Public routes:** 2 (landing, auth)
- **Password operations:** 2 (initial, update)
- **Profile operations:** 3 (create, read, update)

---

## 📝 Additional Notes

### Supabase Configuration
The project uses Supabase v2.89.0 with Row Level Security (RLS) likely configured on the backend. Review RLS policies to ensure they properly restrict access:
- Verify users can only read/update their own profiles
- Verify proper group membership checks for shared data
- Verify deletion policies are secure

### Environment Setup
The `.env.example` file indicates the proper setup:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Ensure all environments (development, staging, production) use their own credentials.

---

## 🎯 Conclusion

The Päronsplit authentication system has a solid foundation with proper React patterns and state management. However, several security issues need immediate attention:

1. **Most Critical:** Hardcoded credentials must be moved to environment variables
2. **User-Facing:** Account deletion doesn't actually delete accounts
3. **Security:** Email verification is not enforced

Addressing these issues will significantly improve the security posture of the application. The positive findings show good architectural decisions that should be maintained going forward.

---

**Report End**
