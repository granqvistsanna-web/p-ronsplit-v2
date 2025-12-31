# Supabase Rate Limiting Configuration

This document explains how to configure rate limiting in Supabase to protect the authentication system from brute force attacks.

## Overview

Rate limiting protects your application from:
- **Brute Force Attacks**: Repeated login attempts to guess passwords
- **Password Enumeration**: Testing which emails are registered
- **Account Takeover**: Automated credential stuffing attacks
- **Resource Exhaustion**: Excessive API calls that impact performance

The Päronsplit app uses a **two-layer defense**:
1. ✅ **Client-side throttling** (already implemented in `src/pages/Auth.tsx`)
2. ⚠️ **Server-side rate limiting** (needs configuration in Supabase Dashboard)

---

## Client-Side Rate Limiting (Already Implemented)

The Auth page (`src/pages/Auth.tsx`) includes client-side rate limiting:

- **5 failed attempts** triggers a temporary block
- **Exponential backoff**: 1s, 2s, 4s, 8s... up to 60s maximum
- **Warning after 3 attempts**: User gets warned before being blocked
- **Countdown timer**: Button shows remaining wait time
- **Auto-reset**: Clears on successful login
- **Persistent**: Survives page refresh (uses localStorage)

### How It Works

```typescript
// After 5 failed login attempts:
// Attempt 6: Wait 1 second
// Attempt 7: Wait 2 seconds
// Attempt 8: Wait 4 seconds
// Attempt 9: Wait 8 seconds
// Attempt 10+: Wait 60 seconds (max)
```

**Note:** Client-side rate limiting can be bypassed by determined attackers (e.g., clearing localStorage). It's a UX feature that protects honest users from themselves and deters casual attacks. **Server-side rate limiting is critical for real security.**

---

## Server-Side Rate Limiting (Required Configuration)

Supabase provides built-in rate limiting through GoTrue (its auth server). This must be configured in your Supabase project.

### Option 1: Enable Rate Limiting in Supabase Dashboard (Recommended)

#### For Projects on Supabase Pro Plan or Higher

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to Authentication** → Click "Settings" in the left sidebar
3. **Scroll to "Rate Limits"** section
4. **Configure Auth Rate Limits**:

   ```
   Rate Limit for /auth endpoints:
   ├─ Requests per hour: 100
   ├─ Burst size: 10
   └─ Enable: ✓ (checked)
   ```

5. **Click "Save"**

#### Recommended Settings

Based on typical usage patterns for a finance app:

```yaml
# Auth endpoints rate limiting
/auth/v1/signup:
  rate: 5 per hour per IP
  burst: 2

/auth/v1/token (login):
  rate: 20 per hour per IP
  burst: 5

/auth/v1/recover (password reset):
  rate: 3 per hour per IP
  burst: 1

/auth/v1/verify:
  rate: 10 per hour per IP
  burst: 3
```

### Option 2: Configure via Supabase CLI

If your plan supports it, you can configure rate limiting via the CLI:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to your project
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Configure rate limiting in supabase/config.toml
```

Add to `supabase/config.toml`:

```toml
[auth.rate_limit]
# Overall auth rate limit per IP
email_sign_in = "20 per hour"
email_sign_up = "5 per hour"
sms_sign_in = "10 per hour"
sms_sign_up = "3 per hour"
password_recovery = "3 per hour"
email_verification = "10 per hour"

# Burst allowance
burst_size = 5
```

Then deploy:

```bash
supabase db push
```

### Option 3: Use Supabase Edge Functions with Custom Logic

For more granular control, create an Edge Function that wraps auth operations:

```typescript
// supabase/functions/auth-with-rate-limit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

serve(async (req) => {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + 3600000 }; // 1 hour window
  }

  // Check rate limit
  if (entry.count >= 20) {
    const remainingTime = Math.ceil((entry.resetAt - now) / 1000 / 60);
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${remainingTime} minutes.`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(ip, entry);

  // Forward to actual auth endpoint
  // ... (implement auth logic here)
});
```

**Deploy:**
```bash
supabase functions deploy auth-with-rate-limit
```

---

## Testing Rate Limiting

### Test Client-Side Rate Limiting

1. Open the app in a browser
2. Go to the login page
3. Enter incorrect credentials 5 times
4. Observe:
   - ✓ Warning toast after 3rd attempt
   - ✓ Error toast after 5th attempt with countdown
   - ✓ Button disabled with countdown timer
   - ✓ Can't submit during cooldown period

### Test Server-Side Rate Limiting

```bash
# Test with curl (replace with your Supabase URL)
for i in {1..25}; do
  curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: your-anon-key" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    && echo " - Request $i"
done
```

**Expected Result:**
- First 20 requests: HTTP 400 (Invalid credentials)
- After 20 requests: HTTP 429 (Too Many Requests)

---

## Monitoring Rate Limit Events

### In Supabase Dashboard

1. **Go to Logs** → "Auth Logs"
2. **Filter by error code**: `429` (Too Many Requests)
3. **Monitor patterns**:
   - Are legitimate users getting blocked?
   - Are there suspicious IPs with many attempts?
   - Do limits need adjustment?

### Example Log Query

```sql
-- View rate-limited auth attempts in the last 24 hours
SELECT
  created_at,
  auth.users.email,
  log->>'message' as message,
  log->>'ip' as ip_address
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND log->>'status_code' = '429'
ORDER BY created_at DESC;
```

---

## Adjusting Rate Limits

### When to Increase Limits

- **Legitimate users getting blocked**: If real users report being unable to log in
- **High user activity periods**: During launches or marketing campaigns
- **Shared IP addresses**: Corporate networks or VPNs may need higher limits

### When to Decrease Limits

- **Suspicious activity**: If you see patterns of brute force attacks
- **Resource constraints**: To reduce load on your database
- **Compliance requirements**: Some security standards require strict rate limiting

### Recommended Approach

Start with **moderate limits** and adjust based on monitoring:

```
Login attempts: 20 per hour (current)
If abuse detected: Reduce to 10 per hour
If users complain: Increase to 30 per hour
```

---

## Security Best Practices

### 1. Combine with Strong Password Policy
- Client-side rate limiting works best with strong password requirements
- See `src/pages/Auth.tsx` password validation (Issue #6 addresses this)

### 2. Monitor Failed Login Attempts
```sql
-- Alert when an IP has >50 failed attempts in 1 hour
SELECT
  log->>'ip' as ip_address,
  COUNT(*) as failed_attempts
FROM auth.audit_log_entries
WHERE
  created_at > NOW() - INTERVAL '1 hour'
  AND log->>'event_type' = 'SIGN_IN'
  AND log->>'status_code' = '400'
GROUP BY log->>'ip'
HAVING COUNT(*) > 50;
```

### 3. Implement IP Blocking (Advanced)
For persistent attackers, consider:
- **Cloudflare WAF**: Block IPs at the edge
- **Supabase Network Policies**: Block at database level
- **Edge Function Blocklist**: Maintain a list of banned IPs

### 4. Enable Email Confirmation
- Already implemented in Issue #3
- Prevents attackers from creating spam accounts
- Adds friction to automated attacks

### 5. Consider CAPTCHA for Repeated Failures
After client-side rate limit hits, consider adding:
- **reCAPTCHA v3**: Invisible, scores user behavior
- **hCaptcha**: Privacy-focused alternative
- **Turnstile**: Cloudflare's CAPTCHA

Example integration point in `src/pages/Auth.tsx`:

```typescript
// After 3 failed attempts, show CAPTCHA
if (getRateLimitState().attempts >= 3) {
  // Show CAPTCHA before allowing next attempt
  const captchaToken = await showCaptcha();
  // Verify token before proceeding
}
```

---

## Troubleshooting

### Issue: Legitimate users getting rate limited

**Symptoms:**
- Users report being locked out
- Multiple users from same organization can't log in

**Solutions:**
1. Check if users are behind a corporate proxy/VPN (shared IP)
2. Increase rate limits for that IP range
3. Consider per-email rate limiting instead of per-IP
4. Add whitelisting for known corporate IP ranges

### Issue: Rate limiting not working

**Symptoms:**
- Attackers successfully make many attempts
- No 429 errors in logs

**Diagnosis:**
```bash
# Check if Supabase rate limiting is enabled
curl -I "https://your-project.supabase.co/auth/v1/health"
# Look for X-RateLimit headers
```

**Solutions:**
1. Verify rate limiting is enabled in Supabase Dashboard
2. Check your Supabase plan (some plans don't include rate limiting)
3. Implement custom rate limiting via Edge Functions

### Issue: Client-side rate limit bypassed

**Symptoms:**
- Attacker clears localStorage to reset limits
- Incognito mode bypasses restrictions

**Expected:**
- This is normal! Client-side limiting is UX, not security
- Server-side rate limiting catches these bypasses
- Logs will show the blocked attempts

---

## Implementation Checklist

### Client-Side (Already Done ✅)
- [x] Implement rate limiting in Auth.tsx
- [x] Track failed attempts in localStorage
- [x] Exponential backoff delays
- [x] Warning messages for users
- [x] Countdown timer on submit button
- [x] Auto-clear on successful login

### Server-Side (Action Required ⚠️)
- [ ] Enable rate limiting in Supabase Dashboard
- [ ] Configure appropriate limits for your user base
- [ ] Test rate limiting with multiple failed attempts
- [ ] Monitor auth logs for rate limit events
- [ ] Set up alerts for excessive failed attempts
- [ ] Document rate limits in internal runbooks

### Future Enhancements
- [ ] Add CAPTCHA after multiple failures
- [ ] Implement account lockout after X attempts
- [ ] Email users about suspicious login attempts
- [ ] Geographic rate limiting (block certain countries)
- [ ] Device fingerprinting for better tracking

---

## Related Documentation

- **Client Implementation**: `src/pages/Auth.tsx` (lines 17-127)
- **Auth QA Report**: `AUTH_QA_REPORT.md` (Issue #5)
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **GoTrue Rate Limiting**: https://github.com/supabase/gotrue

---

**Last Updated:** 2025-12-31
**Status:** ✅ Client-side implemented | ⚠️ Server-side needs configuration
