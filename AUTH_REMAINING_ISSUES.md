# Remaining Authentication Issues - Future Sessions

**Date:** 2025-12-31
**Status:** Backlog for future implementation

This document lists the remaining security and quality issues from the Authentication QA Report that have not yet been addressed.

## Completed Issues ✅

- ✅ **Issue #1:** Hardcoded Credentials (CRITICAL)
- ✅ **Issue #2:** Incomplete Account Deletion (HIGH)
- ✅ **Issue #3:** No Email Verification Enforcement (HIGH)

---

## 🟠 High Priority Issues (2 remaining)

### Issue #4: Race Condition in Profile Creation
**Severity:** HIGH
**Estimated Time:** 2-3 hours
**Location:** `src/hooks/useAuth.tsx:41-110, 145-151`

**Problem:**
The profile creation logic uses `setTimeout` to defer profile fetching, indicating timing issues. Duplicate key handling on line 78-90 suggests race conditions.

```typescript
// Current workaround (problematic)
setTimeout(() => {
  if (mounted) {
    fetchProfile(session.user);
  }
}, 0); // This is a red flag
```

**Why It Matters:**
- Profile creation might fail intermittently
- Multiple simultaneous profile creation attempts
- Unreliable user onboarding experience
- Users might end up without profiles in edge cases

**Recommended Solution:**
Use database triggers to automatically create profiles when users sign up.

**SQL Implementation:**
```sql
-- Create automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Client-Side Changes:**
Remove the setTimeout workaround and profile creation logic from `fetchProfile` function.

**Benefits:**
- Eliminates race conditions
- Profiles created atomically with user
- Simpler client code
- More reliable

---

### Issue #5: No Rate Limiting on Auth Attempts
**Severity:** HIGH
**Estimated Time:** 1-2 hours
**Location:** `src/pages/Auth.tsx`

**Problem:**
No client-side or visible rate limiting for login/signup attempts.

**Risks:**
- Vulnerable to brute force attacks
- Password enumeration attacks
- Account takeover attempts
- Resource exhaustion

**Recommended Solution (Multi-layered):**

**Layer 1: Supabase Dashboard Configuration**
```
1. Go to Supabase Dashboard → Authentication → Rate Limits
2. Enable rate limiting:
   - Login attempts: 5 per hour per IP
   - Signup attempts: 3 per hour per IP
   - Password reset: 3 per hour per email
```

**Layer 2: Client-Side Throttling**
```typescript
// Add to Auth.tsx
const [failedAttempts, setFailedAttempts] = useState(0);
const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Check if locked out
  if (lockoutUntil && new Date() < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000);
    toast.error(`För många försök. Försök igen om ${remainingSeconds} sekunder.`);
    return;
  }

  // ... existing code ...

  if (error) {
    const newFailedAttempts = failedAttempts + 1;
    setFailedAttempts(newFailedAttempts);

    // Lockout after 5 failed attempts for 5 minutes
    if (newFailedAttempts >= 5) {
      const lockoutTime = new Date(Date.now() + 5 * 60 * 1000);
      setLockoutUntil(lockoutTime);
      toast.error("För många misslyckade försök. Kontot är låst i 5 minuter.");
    }
  } else {
    // Reset on success
    setFailedAttempts(0);
    setLockoutUntil(null);
  }
};
```

**Layer 3: CAPTCHA (Optional for Production)**
Add CAPTCHA after 3 failed attempts using a service like hCaptcha or Turnstile.

**Benefits:**
- Prevents brute force attacks
- Reduces server load
- Improves security posture
- User-friendly with clear feedback

---

## 🟡 Medium Priority Issues (4 remaining)

### Issue #6: Weak Password Policy
**Severity:** MEDIUM
**Estimated Time:** 30 minutes
**Location:** `src/pages/Auth.tsx:12`

**Problem:**
Minimum password length is only 6 characters with no complexity requirements.

```typescript
// Current (weak)
const passwordSchema = z.string().min(6, "Lösenord måste vara minst 6 tecken");
```

**Recommended Solution:**
```typescript
const passwordSchema = z.string()
  .min(8, "Lösenord måste vara minst 8 tecken")
  .regex(/[A-Z]/, "Minst en stor bokstav krävs")
  .regex(/[a-z]/, "Minst en liten bokstav krävs")
  .regex(/[0-9]/, "Minst en siffra krävs")
  .regex(/[^A-Za-z0-9]/, "Minst ett specialtecken krävs");
```

**Alternative (Better UX):**
Use a password strength library like `zxcvbn` for real-time feedback:

```typescript
import zxcvbn from 'zxcvbn';

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const result = zxcvbn(password);

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabels = ['Mycket svagt', 'Svagt', 'OK', 'Starkt', 'Mycket starkt'];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i <= result.score ? strengthColors[result.score] : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {strengthLabels[result.score]}
      </p>
    </div>
  );
};
```

**Also Update in Supabase Dashboard:**
```
Authentication → Settings → Password requirements
- Minimum length: 8
- Require uppercase: Yes
- Require lowercase: Yes
- Require numbers: Yes
- Require special characters: Yes
```

---

### Issue #7: Error Message Information Disclosure
**Severity:** MEDIUM
**Estimated Time:** 15 minutes
**Location:** `src/pages/Auth.tsx:70-74, 81-84`

**Problem:**
Error messages reveal whether an email is registered, allowing email enumeration.

```typescript
// Current (reveals info)
if (error.message.includes("already registered")) {
  toast.error("E-postadressen är redan registrerad"); // ← Confirms email exists
}

if (error.message.includes("Invalid login")) {
  toast.error("Fel e-post eller lösenord"); // ← Better, but could be more generic
}
```

**Recommended Solution:**
```typescript
// For login - generic message
if (mode === "login") {
  const { error } = await signIn(email, password);
  if (error) {
    toast.error("Inloggningen misslyckades. Kontrollera dina uppgifter.");
  }
}

// For signup - generic message
if (mode === "signup") {
  const { error } = await signUp(email, password, name);
  if (error) {
    toast.error("Registreringen misslyckades. Försök igen eller kontakta support.");
  }
}
```

**Trade-off:**
- **Security:** ✅ Prevents email enumeration
- **UX:** ⚠️ Less specific feedback

**Balanced Approach (Recommended):**
```typescript
// Still specific but delayed
if (mode === "signup") {
  const { error } = await signUp(email, password, name);
  if (error) {
    // Always show success-like message
    toast.info("Om e-postadressen inte redan finns får du en verifieringslänk.");
    // Don't reveal if email exists
  } else {
    toast.success("Verifieringslänk skickad till din e-post");
    navigate("/verify-email");
  }
}
```

---

### Issue #8: Missing Dependency in useCallback
**Severity:** MEDIUM
**Estimated Time:** 2 minutes
**Location:** `src/hooks/useAuth.tsx:232-236`

**Problem:**
```typescript
const refreshProfile = useCallback(async () => {
  if (user) {
    await fetchProfile(user);
  }
}, [user]); // ← Missing fetchProfile dependency
```

**Fix:**
```typescript
const refreshProfile = useCallback(async () => {
  if (user) {
    await fetchProfile(user);
  }
}, [user, fetchProfile]);
```

**Note:** This will likely show an ESLint warning if you have React Hooks linting enabled.

---

### Issue #9: No Session Timeout Visible
**Severity:** MEDIUM
**Estimated Time:** 1-2 hours
**Location:** `src/App.tsx`, `src/hooks/useAuth.tsx`

**Problem:**
React Query has a 5-minute stale time, but there's no auth session timeout or idle timeout.

**Risks:**
- Sessions persist indefinitely
- Security risk on shared devices
- No automatic logout for inactive users

**Recommended Solution:**

Add idle timeout detection to AuthProvider:

```typescript
// Add to src/hooks/useAuth.tsx

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... existing state ...

  const [lastActivity, setLastActivity] = useState(Date.now());
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Idle timeout monitoring
  useEffect(() => {
    if (!user) return;

    const checkIdleTimeout = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      if (idleTime >= IDLE_TIMEOUT) {
        signOut();
        toast.info("Du har loggats ut på grund av inaktivitet");
      }
    };

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Check every minute
    const interval = setInterval(checkIdleTimeout, 60 * 1000);

    // Listen for activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user, lastActivity, signOut]);

  // ... rest of component ...
}
```

**Configuration Options:**
```typescript
// Make timeout configurable
interface AuthProviderProps {
  children: ReactNode;
  idleTimeoutMinutes?: number; // Default: 30
  enableIdleTimeout?: boolean; // Default: true
}
```

**User Warning Before Timeout:**
```typescript
// Warn user 2 minutes before timeout
if (idleTime >= IDLE_TIMEOUT - 2 * 60 * 1000 && idleTime < IDLE_TIMEOUT) {
  toast.warning("Du kommer att loggas ut om 2 minuter på grund av inaktivitet");
}
```

---

## 🔵 Low Priority Issues (3 remaining)

### Issue #10: Inconsistent Error Handling
**Severity:** LOW
**Estimated Time:** 2-3 hours
**Location:** Various files

**Problem:**
- Some errors logged to console only
- Some shown to users via toast
- No centralized error tracking/monitoring

**Recommended Solution:**

**Step 1: Add Error Tracking Service (Sentry)**
```bash
npm install @sentry/react
```

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
    });
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error(error, context);

  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  }
}
```

**Step 2: Centralize Error Handling**
```typescript
// src/lib/errorHandler.ts
import { captureError } from './sentry';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  userMessage?: string;
  context?: Record<string, any>;
}

export function handleError(
  error: Error,
  options: ErrorHandlerOptions = {}
) {
  const {
    showToast = true,
    userMessage = 'Ett fel uppstod. Försök igen.',
    context
  } = options;

  // Log to console
  console.error('Error:', error, context);

  // Send to Sentry
  captureError(error, context);

  // Show user-friendly message
  if (showToast) {
    toast.error(userMessage);
  }
}
```

**Step 3: Use Throughout App**
```typescript
// Before
try {
  await signIn(email, password);
} catch (error) {
  console.error(error);
  toast.error("Login failed");
}

// After
try {
  await signIn(email, password);
} catch (error) {
  handleError(error as Error, {
    userMessage: 'Inloggningen misslyckades',
    context: { email, action: 'login' }
  });
}
```

---

### Issue #11: No Multi-Factor Authentication (MFA)
**Severity:** LOW
**Estimated Time:** 4-6 hours
**Location:** N/A (new feature)

**Problem:**
The application doesn't support MFA, which is a best practice for financial applications.

**Recommended Solution:**

Supabase has built-in MFA support. Implementation:

**Step 1: Enable MFA in Supabase Dashboard**
```
Authentication → Settings → Multi-Factor Authentication → Enable
```

**Step 2: Add MFA Enrollment UI**
```typescript
// src/pages/Settings.tsx - Add to Security Card

const [qrCode, setQrCode] = useState<string | null>(null);
const [verifyCode, setVerifyCode] = useState("");

const handleEnrollMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });

  if (error) {
    toast.error("Kunde inte aktivera MFA");
    return;
  }

  setQrCode(data.totp.qr_code);
};

const handleVerifyMFA = async () => {
  const { error } = await supabase.auth.mfa.challenge({ factorId });

  if (!error) {
    toast.success("MFA aktiverad!");
  }
};
```

**Step 3: Add MFA Challenge to Login**
```typescript
// src/pages/Auth.tsx

const { error } = await signIn(email, password);

if (error?.message?.includes('MFA required')) {
  setShowMFAChallenge(true);
  // Show code input
}
```

**Benefits:**
- Significantly improved security
- Protection against account takeover
- Industry best practice for financial apps
- Required for certain compliance standards

**Effort vs Value:**
- **Effort:** Medium (4-6 hours)
- **Value:** High for security-conscious users
- **Adoption:** May be low unless forced

**Recommendation:** Implement as optional feature, consider making mandatory for high-value accounts.

---

### Issue #12: Loading State Edge Case
**Severity:** LOW
**Estimated Time:** 10 minutes
**Location:** `src/hooks/useAuth.tsx:156-158`

**Problem:**
```typescript
if (event === 'INITIAL_SESSION') {
  setLoading(false);
}
```

Loading is only set to false on `INITIAL_SESSION` event, which might leave `loading=true` in edge cases.

**Recommended Solution:**
```typescript
useEffect(() => {
  let mounted = true;

  // ... existing code ...

  // Add timeout fallback
  const loadingTimeout = setTimeout(() => {
    if (mounted) {
      console.warn('Auth loading timeout reached, forcing loading=false');
      setLoading(false);
    }
  }, 5000); // 5 second timeout

  return () => {
    mounted = false;
    clearTimeout(loadingTimeout);
    subscription.unsubscribe();
  };
}, []);
```

**Alternative (Better):**
```typescript
// Set loading to false after initial attempt regardless
supabase.auth.getSession().then(({ data: { session } }) => {
  // ... existing code ...
  setLoading(false); // Always set to false
}).catch((error) => {
  console.error("Error initializing auth session:", error);
  setLoading(false); // Set to false even on error
});
```

---

## 📊 Priority Matrix

| Priority | Issue | Severity | Time | Impact |
|----------|-------|----------|------|--------|
| 1 | #4 Race Condition | HIGH | 2-3h | High |
| 2 | #5 Rate Limiting | HIGH | 1-2h | High |
| 3 | #6 Password Policy | MEDIUM | 30m | Medium |
| 4 | #7 Error Disclosure | MEDIUM | 15m | Medium |
| 5 | #8 Missing Dependency | MEDIUM | 2m | Low |
| 6 | #9 Session Timeout | MEDIUM | 1-2h | Medium |
| 7 | #10 Error Handling | LOW | 2-3h | Low |
| 8 | #11 MFA | LOW | 4-6h | Low |
| 9 | #12 Loading State | LOW | 10m | Low |

---

## 🎯 Recommended Implementation Order

### Sprint 1 (Quick Wins)
1. **Issue #8** - Missing Dependency (2 min) ✅
2. **Issue #12** - Loading State (10 min) ✅
3. **Issue #7** - Error Messages (15 min) ✅
4. **Issue #6** - Password Policy (30 min) ✅

**Total: ~1 hour**

### Sprint 2 (High Impact)
5. **Issue #5** - Rate Limiting (1-2 hours) ✅
6. **Issue #9** - Session Timeout (1-2 hours) ✅
7. **Issue #4** - Race Condition (2-3 hours) ✅

**Total: 4-7 hours**

### Sprint 3 (Polish)
8. **Issue #10** - Error Handling (2-3 hours) ✅
9. **Issue #11** - MFA (4-6 hours) ✅

**Total: 6-9 hours**

---

## 📝 Usage for Future Sessions

When starting a new session, you can say:

**For Quick Fixes:**
> "Let's knock out the quick wins from AUTH_REMAINING_ISSUES.md - Issues #8, #12, #7, and #6"

**For Security Hardening:**
> "Implement rate limiting and session timeout from AUTH_REMAINING_ISSUES.md"

**For Production Readiness:**
> "Let's implement the race condition fix and centralized error handling"

**For Premium Features:**
> "Add MFA support as described in AUTH_REMAINING_ISSUES.md Issue #11"

---

## 🔗 Related Documents

- **AUTH_QA_REPORT.md** - Full security audit
- **AUTH_IMPLEMENTATION_PLAN.md** - Implementation guide for issues #1-3
- **SUPABASE_EDGE_FUNCTION_SETUP.md** - Edge function deployment

---

**Last Updated:** 2025-12-31
**Total Remaining Issues:** 9
**Estimated Total Time:** 11-17 hours
