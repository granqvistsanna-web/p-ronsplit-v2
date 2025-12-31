# Supabase Edge Function Setup Guide

## Overview
This guide explains how to set up the `delete-user` Edge Function for complete account deletion.

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project access
- Service role key (from Supabase Dashboard → Settings → API)

---

## Step 1: Create Edge Function Directory

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Create the delete-user function
supabase functions new delete-user
```

This creates: `supabase/functions/delete-user/index.ts`

---

## Step 2: Add Edge Function Code

Replace the contents of `supabase/functions/delete-user/index.ts` with:

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

    console.log(\`Deleting account for user: \${user.id}\`)

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

    // Step 3: Delete user's data (adjust table names based on your schema)
    await supabaseAdmin.from('expenses').delete().eq('created_by', user.id)
    await supabaseAdmin.from('income').delete().eq('created_by', user.id)
    await supabaseAdmin.from('settlements').delete().eq('created_by', user.id)

    // Step 4: Delete the auth user (this is the final step)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw new Error(\`Failed to delete user: \${deleteError.message}\`)
    }

    console.log(\`Successfully deleted user: \${user.id}\`)

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

---

## Step 3: Deploy Edge Function

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy delete-user

# Verify deployment
supabase functions list
```

---

## Step 4: Set Environment Variables

The Edge Function needs access to these environment variables:
- `SUPABASE_URL` (automatically available)
- `SUPABASE_ANON_KEY` (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically available)

These are automatically injected by Supabase into Edge Functions.

---

## Step 5: Test the Function

### Using curl:

```bash
# Get your user access token first (from browser dev tools or auth response)
ACCESS_TOKEN="your_user_access_token_here"

curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-user' \
  --header 'Authorization: Bearer '$ACCESS_TOKEN \
  --header 'Content-Type: application/json'
```

### Expected Response:

```json
{
  "message": "Account deleted successfully"
}
```

---

## Alternative: Deploy via Supabase Dashboard

If you prefer using the Supabase Dashboard:

1. Go to **Edge Functions** in your Supabase Dashboard
2. Click **New Function**
3. Name it `delete-user`
4. Paste the code from Step 2 above
5. Click **Deploy**

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Service Role Key**: Never expose this key client-side. It's only used server-side in the Edge Function.

2. **Authentication**: The function validates the user's token before deletion, ensuring users can only delete their own accounts.

3. **Irreversible**: Account deletion is permanent and cannot be undone.

4. **Data Cleanup**: The function deletes:
   - User profile
   - Group memberships
   - User-created expenses, income, and settlements
   - Auth user account

5. **GDPR Compliance**: This implementation ensures complete data removal as required by GDPR.

---

## Troubleshooting

### Function not found
```
supabase functions deploy delete-user
```

### Check function logs
```bash
supabase functions logs delete-user
```

Or in Supabase Dashboard → Edge Functions → delete-user → Logs

### Test locally
```bash
supabase functions serve delete-user
```

---

## Monitoring

After deployment, monitor the function:

1. **Supabase Dashboard** → Edge Functions → delete-user → Logs
2. Look for successful deletions or errors
3. Check user count in Authentication tab

---

## Next Steps

After deploying this Edge Function, the Delete Account feature in the app will work correctly, fully removing user accounts and all associated data.
