# Email Verification Setup Guide

## Problem
You're not receiving verification emails when creating an account.

## Solution
This requires configuration in the Supabase Dashboard. Follow these steps:

### Step 1: Enable Email Confirmations

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **Päronsplit v3** (xgmsleodlfdiguayubep)
3. Navigate to **Authentication** → **Providers** (or **Settings**)
4. Find the **Email** provider section
5. Enable **"Enable email confirmations"** (toggle it ON)
6. Save changes

### Step 2: Add Redirect URLs

The app needs to know which URLs are allowed for email verification redirects.

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **"Redirect URLs"**, add these URLs (one per line):

```
http://localhost:8080/
http://localhost:8080
http://localhost:5173/
http://localhost:5173
https://your-production-domain.com/
```

**Important:** Replace `your-production-domain.com` with your actual production domain when you deploy.

3. Under **"Site URL"**, set it to:
   - For development: `http://localhost:8080`
   - For production: `https://your-production-domain.com`

4. Click **Save**

### Step 3: Check Email Provider Settings

1. Go to **Authentication** → **Settings**
2. Scroll to **"Email Auth"** section
3. Verify:
   - ✅ **Enable email confirmations** is ON
   - ✅ **Confirm email** is ON
   - ✅ **Secure email change** is ON (optional but recommended)

### Step 4: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"** template
3. Verify the template contains `{{ .ConfirmationURL }}` or `{{ .Token }}`
4. Customize the email content if desired

### Step 5: Check SMTP Settings

By default, Supabase uses their built-in email service (limited to 4 emails/hour).

**For Development:**
- The default service should work fine for testing
- Check your spam/junk folder if emails don't arrive

**For Production:**
- Consider setting up a custom SMTP provider (SendGrid, AWS SES, etc.)
- Go to **Authentication** → **Settings** → **SMTP Settings**
- Configure your SMTP credentials

### Step 6: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

2. Try creating a new account
3. Check your email inbox (and spam folder)
4. Click the verification link in the email

### Troubleshooting

#### Still not receiving emails?

1. **Check browser console** for any errors
2. **Check Supabase logs:**
   - Go to **Logs** → **Auth Logs** in Supabase Dashboard
   - Look for email sending errors

3. **Verify redirect URL matches:**
   - Your app uses: `http://localhost:8080/` (from vite.config.ts)
   - Make sure this exact URL is in the allowed redirect URLs list

4. **Check rate limits:**
   - Default Supabase email service: 4 emails/hour
   - If you've sent too many, wait an hour or set up custom SMTP

5. **Try a different email address:**
   - Some email providers block automated emails
   - Try Gmail, Outlook, or another provider

6. **Check email provider spam filters:**
   - Look in spam/junk folder
   - Add `noreply@mail.app.supabase.io` to your contacts

#### Common Error Messages

- **"Invalid redirect URL"**: Add the URL to allowed redirect URLs in Supabase
- **"Email rate limit exceeded"**: Wait 1 hour or set up custom SMTP
- **"Email confirmation disabled"**: Enable it in Authentication → Settings

### Quick Checklist

- [ ] Email confirmations enabled in Supabase
- [ ] Redirect URLs added (including `http://localhost:8080/`)
- [ ] Site URL configured
- [ ] Email templates configured
- [ ] Tested with a new account signup
- [ ] Checked spam folder
- [ ] Checked Supabase Auth logs for errors

### Need Help?

If you're still having issues:
1. Check Supabase Dashboard → **Logs** → **Auth Logs** for detailed error messages
2. Verify your project settings match the instructions above
3. Try using a different email address to test

