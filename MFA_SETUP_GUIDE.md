# Multi-Factor Authentication (MFA) Setup Guide

**Date:** 2025-12-31
**Project:** Päronsplit
**Status:** Optional Enhancement
**Priority:** LOW

---

## 📋 Overview

This guide explains how to implement Multi-Factor Authentication (MFA) in Päronsplit using Supabase's built-in MFA features. MFA adds an extra layer of security by requiring users to verify their identity using a second factor (typically a time-based one-time password from an authenticator app).

**Note:** MFA is currently NOT implemented in Päronsplit. This is an optional enhancement for improved security, especially recommended for financial applications.

---

## 🎯 Why MFA?

### Benefits
✅ **Enhanced Security** - Protects accounts even if passwords are compromised
✅ **Industry Standard** - Expected feature for financial applications
✅ **User Trust** - Demonstrates commitment to security
✅ **Compliance** - May be required for certain regulations

### Use Cases for Päronsplit
- Users managing significant shared expenses
- Users who want extra account protection
- Business/organizational use cases
- Compliance requirements

---

## 🚀 Implementation Options

Supabase supports two MFA methods:

1. **TOTP (Time-based One-Time Password)** - Recommended
   - Works with Google Authenticator, Authy, 1Password, etc.
   - Offline capable
   - Industry standard

2. **Phone/SMS** - Not recommended
   - Less secure (SIM swapping attacks)
   - Requires SMS provider integration
   - Additional costs

**Recommendation:** Implement TOTP for Päronsplit.

---

## 📚 Implementation Guide

### Phase 1: Supabase Configuration (5 minutes)

#### Step 1: Enable MFA in Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Multi-factor authentication":
   - Enable "TOTP (Authenticator apps)"
   - Set "MFA level" to "optional" (or "required" if mandatory)
3. Save settings

#### Step 2: Configure MFA Policy

```sql
-- Run in Supabase SQL Editor

-- Ensure MFA table has proper RLS
ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own MFA factors
CREATE POLICY "Users can view own MFA factors"
  ON auth.mfa_factors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own MFA factors
CREATE POLICY "Users can insert own MFA factors"
  ON auth.mfa_factors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own MFA factors
CREATE POLICY "Users can delete own MFA factors"
  ON auth.mfa_factors
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

### Phase 2: Frontend Implementation

#### Step 1: Create MFA Setup Component

**File:** `src/components/MFASetup.tsx` (new file)

```typescript
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Copy, Check } from "lucide-react";
import QRCode from "qrcode";

export function MFASetup() {
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Päronsplit MFA'
      });

      if (error) throw error;

      // Generate QR code from the URI
      const qrCodeUrl = await QRCode.toDataURL(data.totp.uri);
      setQrCode(qrCodeUrl);
      setSecret(data.totp.secret);
      setFactorId(data.id);

      toast.success("QR-kod genererad");
    } catch (error) {
      console.error("MFA enrollment error:", error);
      toast.error("Kunde inte starta MFA-aktivering");
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verifyCode || !factorId) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (error) throw error;

      const challengeId = data.id;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      toast.success("Tvåfaktorsautentisering aktiverad!");

      // Reset state
      setQrCode("");
      setSecret("");
      setFactorId("");
      setVerifyCode("");
    } catch (error) {
      console.error("MFA verification error:", error);
      toast.error("Felaktig kod. Försök igen.");
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    toast.success("Hemlig nyckel kopierad");
    setTimeout(() => setSecretCopied(false), 2000);
  };

  if (!qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tvåfaktorsautentisering (2FA)
          </CardTitle>
          <CardDescription>
            Lägg till ett extra lager av säkerhet till ditt konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={startEnrollment}
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Förbereder..." : "Aktivera 2FA"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivera Tvåfaktorsautentisering</CardTitle>
        <CardDescription>
          Skanna QR-koden med din autentiseringsapp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <img
            src={qrCode}
            alt="QR Code"
            className="border-4 border-border rounded-lg"
          />
        </div>

        {/* Manual entry secret */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Eller ange manuellt:
          </Label>
          <div className="flex gap-2">
            <Input
              value={secret}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copySecret}
            >
              {secretCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Steg för att aktivera:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Öppna din autentiseringsapp (Google Authenticator, Authy, etc.)</li>
            <li>Skanna QR-koden eller ange den hemliga nyckeln manuellt</li>
            <li>Ange den 6-siffriga koden från appen nedan</li>
          </ol>
        </div>

        {/* Verification */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-code">Verifieringskod</Label>
            <Input
              id="verify-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <Button
            onClick={verifyAndEnable}
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full"
          >
            {isVerifying ? "Verifierar..." : "Verifiera och aktivera"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Note:** Install QRCode library:
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

#### Step 2: Add MFA Management to Settings

**File:** `src/pages/Settings.tsx`

Add import:
```typescript
import { MFASetup } from "@/components/MFASetup";
```

Add to settings page (in security section):
```typescript
{/* MFA Section */}
<Card>
  <CardHeader>
    <CardTitle>Säkerhet</CardTitle>
    <CardDescription>
      Hantera säkerhetsinställningar för ditt konto
    </CardDescription>
  </CardHeader>
  <CardContent>
    <MFASetup />
  </CardContent>
</Card>
```

#### Step 3: Update Login Flow for MFA Challenge

**File:** `src/pages/Auth.tsx`

Update `signIn` to handle MFA:

```typescript
const [mfaRequired, setMfaRequired] = useState(false);
const [mfaCode, setMfaCode] = useState("");
const [currentFactorId, setCurrentFactorId] = useState<string>("");

const handleSignIn = async (email: string, password: string) => {
  const { data, error } = await signIn(email, password);

  if (error) {
    // Check if MFA is required
    if (error.message.includes("mfa")) {
      setMfaRequired(true);
      // Extract factor ID from error or user session
      // You'll need to challenge the factor
      return;
    }
    toast.error("Inloggningen misslyckades");
    return;
  }

  // Check if MFA challenge is needed
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors && factors.totp && factors.totp.length > 0) {
    const factorId = factors.totp[0].id;
    setCurrentFactorId(factorId);

    // Create MFA challenge
    const { data: challenge } = await supabase.auth.mfa.challenge({
      factorId
    });

    setMfaRequired(true);
    return;
  }

  // Normal login (no MFA)
  navigate("/dashboard");
};

const handleMfaVerify = async () => {
  if (!mfaCode || !currentFactorId) return;

  try {
    const { data: challenge } = await supabase.auth.mfa.challenge({
      factorId: currentFactorId
    });

    const { error } = await supabase.auth.mfa.verify({
      factorId: currentFactorId,
      challengeId: challenge.id,
      code: mfaCode
    });

    if (error) throw error;

    toast.success("Inloggad!");
    navigate("/dashboard");
  } catch (error) {
    toast.error("Felaktig kod");
  }
};
```

Add MFA input UI:
```typescript
{mfaRequired && (
  <div className="space-y-4">
    <Label>Tvåfaktorskod</Label>
    <Input
      type="text"
      maxLength={6}
      value={mfaCode}
      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
      placeholder="000000"
      className="text-center text-2xl tracking-widest font-mono"
    />
    <Button onClick={handleMfaVerify} className="w-full">
      Verifiera
    </Button>
  </div>
)}
```

---

### Phase 3: MFA Management Features

#### Disable MFA

```typescript
const disableMFA = async (factorId: string) => {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId
    });

    if (error) throw error;

    toast.success("Tvåfaktorsautentisering inaktiverad");
  } catch (error) {
    console.error("MFA unenroll error:", error);
    toast.error("Kunde inte inaktivera 2FA");
  }
};
```

#### List Active MFA Factors

```typescript
const listMFAFactors = async () => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) throw error;

    return data?.totp || [];
  } catch (error) {
    console.error("MFA list error:", error);
    return [];
  }
};
```

#### Recovery Codes (Important!)

Generate and display recovery codes when MFA is enabled:

```typescript
// In your MFA setup success handler
const generateRecoveryCodes = () => {
  // Generate 10 random recovery codes
  const codes = Array.from({ length: 10 }, () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  });

  return codes;
};

// Show recovery codes to user
toast.success(
  "Spara dessa återställningskoder på en säker plats!",
  { duration: 10000 }
);
```

---

## 🧪 Testing MFA Implementation

### Test Cases

1. **Enrollment Flow**
   - [ ] QR code generates correctly
   - [ ] Manual secret can be copied
   - [ ] TOTP code from authenticator app verifies successfully
   - [ ] Error shown for invalid code
   - [ ] MFA factor saved to database

2. **Login Flow**
   - [ ] Users without MFA can login normally
   - [ ] Users with MFA prompted for code
   - [ ] Valid code allows login
   - [ ] Invalid code rejected with clear error
   - [ ] Expired codes rejected

3. **Management**
   - [ ] Users can list their MFA factors
   - [ ] Users can disable MFA (with verification)
   - [ ] Recovery codes generated and displayed
   - [ ] Multiple authenticator apps can be added

4. **Edge Cases**
   - [ ] Network failure during enrollment
   - [ ] User closes browser during setup
   - [ ] Multiple MFA factors (if supported)
   - [ ] Clock skew handling (codes work ±30 seconds)

### Manual Testing

```typescript
// Test MFA enrollment
const testEnrollment = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp'
  });
  console.log('Enrollment:', data, error);
};

// Test MFA challenge
const testChallenge = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId
  });
  console.log('Challenge:', data, error);
};

// Test MFA verification
const testVerify = async (factorId: string, challengeId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  });
  console.log('Verify:', data, error);
};
```

---

## 📊 Database Schema

MFA data is stored in Supabase's `auth.mfa_factors` table:

```sql
-- View MFA factors (admin only)
SELECT
  id,
  user_id,
  friendly_name,
  factor_type,
  status,
  created_at,
  updated_at
FROM auth.mfa_factors
WHERE user_id = '<user-id>';
```

---

## 🎨 UX Considerations

### Best Practices

1. **Optional by Default** - Don't force MFA initially
2. **Clear Instructions** - Guide users through setup
3. **Recovery Options** - Provide recovery codes
4. **Support Multiple Apps** - Allow backup authenticators
5. **Remember Device** (optional) - Reduce MFA prompts on trusted devices

### User Communication

**Email Template: MFA Enabled**
```
Subject: Tvåfaktorsautentisering aktiverad

Hej [Name],

Tvåfaktorsautentisering (2FA) har aktiverats för ditt Päronsplit-konto.

Från och med nu behöver du:
1. Ditt lösenord
2. En 6-siffrig kod från din autentiseringsapp

Detta ger extra säkerhet för ditt konto.

Spara dina återställningskoder på en säker plats!

Återställningskoder:
[codes]

Om du inte aktiverade 2FA, kontakta oss omedelbart.

Vänliga hälsningar,
Päronsplit
```

---

## 🔐 Security Considerations

### Important Security Measures

1. **Recovery Codes** - Always generate and display recovery codes
2. **Backup Factors** - Allow users to register multiple devices
3. **Rate Limiting** - Limit MFA verification attempts (3-5 per minute)
4. **Account Recovery** - Have a support process for locked-out users
5. **Secure Storage** - Never log or store TOTP secrets in plain text
6. **Clock Sync** - Handle time drift gracefully (±30 second window)

### Rate Limiting MFA Attempts

```typescript
// Add to rate limiting logic in Auth.tsx
const MFA_MAX_ATTEMPTS = 5;
const MFA_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const checkMFARateLimit = () => {
  const attempts = getMFAAttempts();
  if (attempts >= MFA_MAX_ATTEMPTS) {
    const lastAttempt = getLastMFAAttempt();
    const timeSince = Date.now() - lastAttempt;

    if (timeSince < MFA_COOLDOWN) {
      const waitTime = Math.ceil((MFA_COOLDOWN - timeSince) / 1000);
      toast.error(`För många försök. Försök igen om ${waitTime} sekunder.`);
      return false;
    }

    // Reset attempts after cooldown
    resetMFAAttempts();
  }

  return true;
};
```

---

## 📱 Recommended Authenticator Apps

Suggest these apps to users:

- **Google Authenticator** (iOS, Android)
- **Microsoft Authenticator** (iOS, Android)
- **Authy** (iOS, Android, Desktop)
- **1Password** (Paid, all platforms)
- **Bitwarden** (Free, all platforms)

---

## 🚨 Support & Troubleshooting

### Common Issues

**Issue: "QR code not scanning"**
- Provide manual entry option (secret key)
- Ensure QR code is large enough
- Check for camera permissions

**Issue: "Code not working"**
- Check device time is synced
- Code expires every 30 seconds
- Try the next code

**Issue: "Lost authenticator device"**
- Use recovery codes
- Contact support for manual verification
- Implement account recovery flow

### Account Recovery Process

For users who lost access:

1. **Recovery Codes** - First line of defense
2. **Email Verification** - Send magic link to verified email
3. **Support Ticket** - Manual verification by support team
4. **Identity Verification** - Request ID verification for account recovery

---

## 📈 Metrics to Track

Monitor these metrics after MFA implementation:

- **MFA Adoption Rate** - % of users with MFA enabled
- **MFA Success Rate** - % of successful MFA challenges
- **Failed MFA Attempts** - Track potential attacks
- **Recovery Code Usage** - How often codes are used
- **Support Tickets** - MFA-related support volume

---

## 🎯 Implementation Checklist

### Pre-Implementation
- [ ] Review security requirements
- [ ] Decide if MFA is optional or required
- [ ] Choose authenticator app recommendations
- [ ] Plan recovery process
- [ ] Design UI/UX flows

### Implementation
- [ ] Enable MFA in Supabase Dashboard
- [ ] Install QRCode library
- [ ] Create `MFASetup` component
- [ ] Update `Settings` page
- [ ] Update `Auth` login flow
- [ ] Implement recovery codes
- [ ] Add rate limiting
- [ ] Create user documentation

### Testing
- [ ] Test enrollment flow
- [ ] Test login with MFA
- [ ] Test MFA disable
- [ ] Test recovery codes
- [ ] Test edge cases
- [ ] Perform security audit

### Documentation
- [ ] Update user documentation
- [ ] Create support articles
- [ ] Document recovery process
- [ ] Add to onboarding flow

### Deployment
- [ ] Deploy to staging
- [ ] Test with real authenticator apps
- [ ] Monitor error logs
- [ ] Deploy to production
- [ ] Announce to users

---

## 📝 Cost Considerations

**Supabase MFA Costs:**
- TOTP MFA is included in all Supabase plans
- No additional fees for TOTP-based MFA
- SMS-based MFA would require separate provider (Twilio, etc.)

**Development Time Estimate:**
- Initial implementation: 8-12 hours
- Testing & refinement: 4-6 hours
- Documentation: 2-3 hours
- **Total: ~15-20 hours**

---

## 🔗 Resources

### Supabase Documentation
- [MFA Overview](https://supabase.com/docs/guides/auth/auth-mfa)
- [TOTP Setup](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [MFA API Reference](https://supabase.com/docs/reference/javascript/auth-mfa-enroll)

### Libraries
- [qrcode](https://www.npmjs.com/package/qrcode) - QR code generation
- [otplib](https://www.npmjs.com/package/otplib) - TOTP utilities (if needed)

### Standards
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [RFC 4226 - HOTP](https://tools.ietf.org/html/rfc4226)

---

## 🎓 Summary

MFA is a valuable security enhancement for Päronsplit, especially given it's a financial application. While it's currently a low priority optional feature, this guide provides everything needed for implementation.

**Key Takeaways:**
- Use TOTP-based MFA (not SMS)
- Make it optional initially
- Always provide recovery codes
- Test thoroughly before deployment
- Monitor adoption and support needs

When ready to implement, follow this guide step-by-step for a secure, user-friendly MFA experience.

---

**For questions or implementation support, refer to the Supabase MFA documentation or this guide.**
